import * as mysql from 'mysql'

import {DB_HOST, DB_NAME, DB_USER, DB_PASS, DB_PORT} from './settings'
import {Connection, createConnection} from "typeorm"

import {Chart} from './model/Chart'
import User from './model/User'
import UserInvitation from './model/UserInvitation'

let pool: mysql.Pool
let connection: Connection

export async function connect() {
    pool = mysql.createPool({
        host: DB_HOST,
        user: DB_USER,
        database: DB_NAME
    })

    connection = await createConnection({
        type: "mysql",
        host: DB_HOST,
        port: DB_PORT,
        username: DB_USER,
        password: DB_PASS,
        database: DB_NAME,
        entities: [Chart, User, UserInvitation]
    })
}

export function getConnection(): Promise<mysql.PoolConnection> {
    return new Promise((resolve, reject) => {
        pool.getConnection((poolerr, conn) => {
            if (poolerr) {
                reject(poolerr)
            } else {
                resolve(conn)
            }
        })
    })
}

class TransactionContext {
    conn: mysql.PoolConnection
    constructor(conn: mysql.PoolConnection) {
        this.conn = conn
    }

    execute(queryStr: string, params?: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            this.conn.query(queryStr, params, (err, rows) => {
                if (err) return reject(err)
                resolve(rows)
            })
        })
    }

    query(queryStr: string, params?: any[]): Promise<any> {
        return new Promise((resolve, reject) => {
            this.conn.query(queryStr, params, (err, rows) => {
                if (err) return reject(err)
                resolve(rows)
            })
        })
    }
}

export async function transaction<T>(callback: (t: TransactionContext) => Promise<T>): Promise<T> {
    const conn = await getConnection()
    const t = new TransactionContext(conn)

    try {
        await t.execute("START TRANSACTION")
        const result = await callback(t)
        await t.execute("COMMIT")
        return result
    } catch (err) {
        await t.execute("ROLLBACK")
        throw err
    } finally {
        t.conn.release()
    }
}

export function query(queryStr: string, params?: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
        pool.query(queryStr, params, (err, rows) => {
            if (err) return reject(err)
            resolve(rows)
        })
    })
}

// For operations that modify data (TODO: handling to check query isn't used for this)
export function execute(queryStr: string, params?: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
        pool.query(queryStr, params, (err, rows) => {
            if (err) return reject(err)
            resolve(rows)
        })
    })
}

export async function get(queryStr: string, params?: any[]): Promise<any> {
    return (await query(queryStr, params))[0]
}

export async function end() {
    if (pool)
        pool.end()
    if (connection)
        await connection.close()
}