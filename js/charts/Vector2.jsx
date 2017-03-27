/* Vector2.jsx
 * ================                                                             
 *
 * Vector utility class
 * Partly based on the Unity vector: https://docs.unity3d.com/ScriptReference/Vector2.html
 * Wraps the Victor library, mainly so we can do type hinting
 *
 * @project Our World In Data
 * @author  Jaiden Mispy
 * @created 2017-03-15
 */ 

// @flow

import _ from 'lodash'
import Victor from 'victor'

export default class Vector2 {
	x: number
	y: number
	_v: Victor

	static distanceSq(a: Vector2, b: Vector2): number {
		return (b.x-a.x)**2 + (b.y-a.y)**2
	}

	static distance(a: Vector2, b: Vector2): number {
		return Math.sqrt(Vector2.distanceSq(a, b))
	}

	// From: http://stackoverflow.com/a/1501725/1983739
	static distanceFromPointToLineSq(p: Vector2, v: Vector2, w: Vector2): number {
		const l2 = Vector2.distanceSq(v, w)
		if (l2 == 0) 
			return Vector2.distanceSq(p, v)

		let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2
		t = Math.max(0, Math.min(1, t))
		return Vector2.distanceSq(p, new Vector2(v.x + t * (w.x - v.x), v.y + t * (w.y - v.y)))
	}

	static distanceFromPointToLine(p: Vector2, v: Vector2, w: Vector2): number {
		return Math.sqrt(Vector2.distanceFromPointToLineSq(p, v, w))
	}

	static fromArray(a: [number, number]): Vector2 {
		return new Vector2(a[0], a[1])
	}

	static fromObject(o: { x: number, y: number }): Vector2 {
		return new Vector2(o.x, o.y)
	}

	static intersectLines(a0: Vector2, a1: Vector2, b0: Vector2, b1: Vector2) {
	    var ua, ub, denom = (b1.y - b0.y)*(a1.x - a0.x) - (b1.x - b0.x)*(a1.y - a0.y);
	    if (denom == 0) {
	        return null;
	    }
	    ua = ((b1.x - b0.x)*(a0.y - b0.y) - (b1.y - b0.y)*(a0.x - b0.x))/denom;
	    ub = ((a1.x - a0.x)*(a0.y - b0.y) - (a1.y - a0.y)*(a0.x - b0.x))/denom;

	    const x = a0.x + ua*(a1.x - a0.x)
	    const y = a0.y + ua*(a1.y - a0.y)

	    return new Vector2(x, y)
    }

	subtract(v: Vector2): Vector2 {
		return Vector2.fromObject(new Victor(this.x, this.y).subtract(new Victor(v.x, v.y)))
	}

	add(v: Vector2): Vector2 {
		return Vector2.fromObject(new Victor(this.x, this.y).add(new Victor(v.x, v.y)))
	}

	times(n: number): Vector2 {
		return new Vector2(this.x*n, this.y*n)
	}

	clone(): Vector2 {
		return new Vector2(this.x, this.y)
	}

	get magnitude(): number {
		return this._v.magnitude()
	}

	get normalized(): Vector2 {
		return Vector2.fromObject(new Victor(this.x, this.y).normalize())
	}

	toString(): string {
		return `Vector2<${this.x}, ${this.y}>`
	}

	constructor(x: number, y: number) {
		this.x = x
		this.y = y
	}
}