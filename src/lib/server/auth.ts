import { SignJWT, jwtVerify } from 'jose';
import { createHash, timingSafeEqual } from 'crypto';
import { env } from '$env/dynamic/private';

function getSecret() {
	const raw = env.JWT_SECRET ?? 'dev-fallback-secret-change-me';
	return new TextEncoder().encode(raw);
}

export async function createToken(username: string): Promise<string> {
	return new SignJWT({ username })
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('7d')
		.sign(getSecret());
}

export async function verifyToken(token: string): Promise<{ username: string } | null> {
	try {
		const { payload } = await jwtVerify(token, getSecret());
		return { username: payload.username as string };
	} catch {
		return null;
	}
}

export function checkCredentials(username: string, password: string): boolean {
	const expectedUser = env.AUTH_USERNAME ?? 'admin';
	const expectedPass = env.AUTH_PASSWORD ?? 'admin';

	const hashA = createHash('sha256').update(username).digest();
	const hashB = createHash('sha256').update(expectedUser).digest();
	const userMatch = timingSafeEqual(hashA, hashB);

	const hashC = createHash('sha256').update(password).digest();
	const hashD = createHash('sha256').update(expectedPass).digest();
	const passMatch = timingSafeEqual(hashC, hashD);

	return userMatch && passMatch;
}
