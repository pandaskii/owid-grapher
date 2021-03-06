import * as React from 'react'
import * as express from 'express'
import * as crypto from 'crypto'
import * as randomstring from 'randomstring'
import {Router} from 'express'

// For backwards compatibility, we reimplement Django authentication and session code a bit
const hashers = require('node-django-hashers')

import * as db from '../db'
import { SECRET_KEY, SESSION_COOKIE_AGE } from '../settings'

export interface CurrentUser {
    id: number
    name: string
    email: string
    fullName: string
    isSuperuser: boolean
}

export type Request = express.Request

export interface Response extends express.Response {
    locals: { user: CurrentUser, session: Session }
}

export interface Session {
    id: string
    expiryDate: Date
}

export async function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    let user: CurrentUser|undefined
    let session: Session|undefined

    const sessionid = req.cookies['sessionid']
    if (sessionid) {
        // Expire old sessions
        await db.execute("DELETE FROM django_session WHERE expire_date < NOW()")

        const rows = await db.query(`SELECT * FROM django_session WHERE session_key = ?`, [sessionid])
        if (rows.length) {
            const sessionData = Buffer.from(rows[0].session_data, 'base64').toString('utf8')
            const sessionJson = JSON.parse(sessionData.split(":").slice(1).join(":"))

            user = (await db.query(`SELECT id, name, email, full_name as fullName, is_superuser as isSuperuser FROM users WHERE id = ?`, [sessionJson._auth_user_id]))[0]
            session = { id: sessionid, expiryDate: rows[0].expiry_date }
        }
    }

    // Authed urls shouldn't be cached
    res.set('Cache-Control', 'public, max-age=0, must-revalidate')

    if (user) {
        res.locals.session = session
        res.locals.user = user
        return next()
    } else if (!req.path.startsWith('/admin') || req.path === "/admin/login" || req.path === "/admin/register") {
        return next()
    } else {
        return res.redirect(`/admin/login?next=${req.path}`)
    }
}

function saltedHmac(salt: string, value: string): string {
    const hmac = crypto.createHmac('sha1', salt+SECRET_KEY)
    hmac.update(value)
    return hmac.digest('hex')
}

export async function tryLogin(email: string, password: string): Promise<Session> {
    const user = await db.get(`SELECT id, password FROM users WHERE email=?`, [email])
    if (!user) {
        throw new Error("No such user")
    }

    const h = new hashers.BCryptPasswordHasher()
    if (await h.verify(password, user.password)) {
        const sessionId = randomstring.generate()

        const sessionJson = JSON.stringify({
            _auth_user_id: user.id,
            _auth_user_backend: "django.contrib.auth.backends.ModelBackend",
            _auth_user_hash: saltedHmac("django.contrib.auth.models.AbstractBaseUser.get_session_auth_hash", password)
        })
        const sessionHash = saltedHmac("django.contrib.sessions.SessionStore", sessionJson)
        const sessionData = Buffer.from(`${sessionHash}:${sessionJson}`).toString('base64')

        const now = new Date()
        const expiryDate = new Date(now.getTime() + (1000*SESSION_COOKIE_AGE))

        await db.execute(`INSERT INTO django_session (session_key, session_data, expire_date) VALUES (?, ?, ?)`, [sessionId, sessionData, expiryDate])

        return { id: sessionId, expiryDate: expiryDate }
    } else {
        throw new Error("Invalid password")
    }
}
