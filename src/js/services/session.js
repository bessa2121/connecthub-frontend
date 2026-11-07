import { api, tokenStore } from './api.js';

const listeners = new Set();

export const session = {
  user: null,
  // Resolve quando a sessão salva foi verificada. As páginas que dependem do usuário
  // aguardam isto; as demais renderizam sem esperar a chamada /auth/me.
  ready: Promise.resolve(),

  subscribe: (listener) => listeners.add(listener),
  emit: () => listeners.forEach((listener) => listener(session.user)),

  restore() {
    session.ready = (async () => {
      if (tokenStore.get()) {
        try {
          session.user = await api.me();
        } catch {
          tokenStore.clear();
        }
      }
      session.emit();
    })();
    return session.ready;
  },

  start({ token, user }) {
    tokenStore.set(token);
    session.user = user;
    session.emit();
  },

  setUser(user) {
    session.user = user;
    session.emit();
  },

  end() {
    tokenStore.clear();
    session.user = null;
    session.emit();
  },
};
