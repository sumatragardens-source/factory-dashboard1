import { dev } from '$app/environment';
import { redirect, type Handle } from '@sveltejs/kit';
import { verifyToken } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	// Bypass auth in local dev
	if (dev) {
		event.locals.user = { id: 0, username: 'dev', role: 'admin' } as any;
		return resolve(event);
	}

	const { pathname } = event.url;

	// Allow login page and static assets through
	if (pathname === '/login' || pathname.startsWith('/_app/') || pathname.startsWith('/favicon')) {
		event.locals.user = null;
		return resolve(event);
	}

	const token = event.cookies.get('auth_token');
	if (!token) {
		throw redirect(303, '/login');
	}

	const user = await verifyToken(token);
	if (!user) {
		event.cookies.delete('auth_token', { path: '/' });
		throw redirect(303, '/login');
	}

	event.locals.user = user;
	return resolve(event);
};
