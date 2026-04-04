const parseCookies = () =>
  document.cookie.split(";").reduce((acc, part) => {
    const [rawKey, ...rawValue] = part.split("=");
    const key = rawKey?.trim();
    if (!key) return acc;
    acc[key] = decodeURIComponent(rawValue.join("=") || "");
    return acc;
  }, {});

export const Cookies = {
  get: (name) => parseCookies()[name],
  set: (name, value, options = {}) => {
    const { expires = 7, secure = window.location.protocol === "https:", path = "/" } = options;
    const expiresAt = new Date(Date.now() + expires * 24 * 60 * 60 * 1000).toUTCString();
    const secureFlag = secure ? "; Secure" : "";
    document.cookie = `${name}=${encodeURIComponent(value)}; Expires=${expiresAt}; Path=${path}; SameSite=Lax${secureFlag}`;
  },
  remove: (name, options = {}) => {
    const { path = "/" } = options;
    document.cookie = `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=${path}; SameSite=Lax`;
  },
};

