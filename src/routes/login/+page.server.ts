import { fail, redirect } from '@sveltejs/kit';
import { createToken, verifyToken, checkCredentials } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('auth_token');
	if (token) {
		const user = await verifyToken(token);
		if (user) throw redirect(303, '/');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const form = await request.formData();
		const username = form.get('username')?.toString() ?? '';
		const password = form.get('password')?.toString() ?? '';

		if (!username || !password) {
			return fail(400, { error: 'Username and password are required', username });
		}

		if (!checkCredentials(username, password)) {
			return fail(401, { error: 'Invalid credentials', username });
		}

		const token = await createToken(username);
		cookies.set('auth_token', token, {
			path: '/',
			httpOnly: true,
			secure: false, // set to true in production with HTTPS
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});

		throw redirect(303, '/');
	}
};
