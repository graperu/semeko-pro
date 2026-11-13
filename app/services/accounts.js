"use strict";
const fs = require("fs"),
  path = require("path"),
  crypto = require("crypto");
const {
  app,
  safeStorage,
  shell,
  clipboard,
  BrowserWindow,
} = require("electron");
const { writeFileAtomicSync } = require("../shared/fs-atomic");
const official=require('./official-submissions');
const file = () => path.join(app.getPath("userData"), "platform-accounts.json");
const pending = new Map(),
  windows = new Set();
let refreshFlight=null;
const clientId = () =>
  process.env.SEMEKO_GITHUB_CLIENT_ID ||
  require("../config/github-oauth.json").clientId;
function read() {
  try {
    return JSON.parse(fs.readFileSync(file(), "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return { profiles: {} };
    throw Error("Could not read account settings");
  }
}
function write(data) {
  fs.mkdirSync(path.dirname(file()), { recursive: true });
  writeFileAtomicSync(file(), JSON.stringify(data));
}
function requireLogin(data) {
  if (
    !data.github ||
    !data.token ||
    (data.expiresAt && data.expiresAt <= Date.now())
  )
    throw Error("Sign in with GitHub first");
  return String(data.github.id);
}
function info() {
  const data = read(),
    github =
      data.token && (!data.expiresAt || data.expiresAt > Date.now())
        ? data.github
        : null;
  return {
    configured: !!clientId(),
    github: github || null,
    links: github ? data.profiles?.[String(github.id)] || {} : {},
    official: official.info(github?.id),
    rememberedLogin:data.github?.login||null,
    sessionExpired:!!data.github&&!github,
  };
}
async function request(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      redirect: "error",
      signal: AbortSignal.timeout(20000),
      headers: {
        Accept: "application/json",
        "User-Agent": "Semeko",
        ...options.headers,
      },
    });
  } catch {
    throw Error("Could not connect to account provider");
  }
  if (!response.ok)
    throw Error(`Account provider returned HTTP ${response.status}`);
  try {
    return await response.json();
  } catch {
    throw Error("Account provider returned invalid data");
  }
}
function focusMain(){for(const win of BrowserWindow.getAllWindows?.()||[])if(!win.isDestroyed()&&win.webContents.getURL().includes('index.html')){if(win.isMinimized?.())win.restore();win.show?.();win.focus?.();}}
function storeTokens(data,value){
 data.token=safeStorage.encryptString(value.access_token).toString('base64');
 data.expiresAt=value.expires_in?Date.now()+Number(value.expires_in)*1000:null;
 if(value.refresh_token){data.refreshToken=safeStorage.encryptString(value.refresh_token).toString('base64');data.refreshExpiresAt=value.refresh_token_expires_in?Date.now()+Number(value.refresh_token_expires_in)*1000:null;}
 else{delete data.refreshToken;delete data.refreshExpiresAt;}
}
async function ensureSession(){
 const initial=read();if(!initial.github||!initial.token||!initial.expiresAt||initial.expiresAt>Date.now()+60000)return info();
 if(!initial.refreshToken||initial.refreshExpiresAt&&initial.refreshExpiresAt<=Date.now())return info();
 if(refreshFlight)return refreshFlight;
 refreshFlight=(async()=>{try{
  const refresh=safeStorage.decryptString(Buffer.from(initial.refreshToken,'base64'));
  const value=await request('https://github.com/login/oauth/access_token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:clientId(),grant_type:'refresh_token',refresh_token:refresh})});
  if(!value.access_token||value.error)throw Error('GitHub refresh unavailable');
  const user=await request('https://api.github.com/user',{headers:{Authorization:'Bearer '+value.access_token}});
  if(user.id!==initial.github.id)throw Error('GitHub identity changed');
  const latest=read();if(latest.token!==initial.token||latest.github?.id!==initial.github.id)return info();
  storeTokens(latest,value);write(latest);return info();
 }catch(_){return info();}finally{refreshFlight=null;}})();return refreshFlight;
}
async function start() {
  const id = clientId();
  if (!id) throw Error("GitHub login is not configured for this build");
  if (
    !safeStorage.isEncryptionAvailable() ||
    safeStorage.getSelectedStorageBackend?.() === "basic_text"
  )
    throw Error("Secure key storage is not available on this computer");
  const value = await request("https://github.com/login/device/code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: id, scope: "read:user" }),
  });
  if (
    !value.device_code ||
    !value.user_code ||
    value.verification_uri !== "https://github.com/login/device" ||
    !Number.isFinite(value.expires_in)
  )
    throw Error(
      "GitHub device login is unavailable. Enable Device Flow for the OAuth App.",
    );
  pending.clear();
  const ticket = crypto.randomUUID(),
    interval = Math.max(5, Number(value.interval) || 5) * 1000;
  pending.set(ticket, {
    device: value.device_code,
    expires: Date.now() + value.expires_in * 1000,
    interval,
    next: Date.now() + interval,
  });
  await shell.openExternal("https://github.com/login/device");
  return {
    ticket,
    code: value.user_code,
    interval: interval / 1000,
    expiresIn: value.expires_in,
  };
}
async function poll(ticket) {
  const state = pending.get(ticket);
  if (!state || Date.now() >= state.expires) {
    pending.delete(ticket);
    throw Error("GitHub login expired. Start again.");
  }
  if (Date.now() < state.next)
    return {
      pending: true,
      interval: Math.ceil((state.next - Date.now()) / 1000),
    };
  state.next = Date.now() + state.interval;
  const value = await request("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId(),
      device_code: state.device,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    }),
  });
  if (pending.get(ticket) !== state) throw Error("GitHub login cancelled");
  if (value.error === "authorization_pending")
    return { pending: true, interval: state.interval / 1000 };
  if (value.error === "slow_down") {
    state.interval += 5000;
    state.next = Date.now() + state.interval;
    return { pending: true, interval: state.interval / 1000 };
  }
  if (value.error || !value.access_token) {
    pending.delete(ticket);
    throw Error(
      value.error === "access_denied"
        ? "GitHub authorization denied"
        : "GitHub login expired. Start again.",
    );
  }
  const user = await request("https://api.github.com/user", {
    headers: { Authorization: "Bearer " + value.access_token },
  });
  if (!Number.isInteger(user.id) || typeof user.login !== "string")
    throw Error("GitHub returned an invalid identity");
  if (pending.get(ticket) !== state) throw Error("GitHub login cancelled");
  const data = read();
  data.github = {
    id: user.id,
    login: user.login,
    name: typeof user.name === "string" ? user.name : user.login,
  };
  storeTokens(data,value);
  data.profiles = data.profiles || {};
  write(data);
  pending.delete(ticket);
  focusMain();
  return { pending: false, account: info() };
}
function cancel(ticket) {
  pending.delete(ticket);
  return true;
}
function logout() {
  const previous=read().github?.id;if(previous)official.closeForOwner(previous);
  pending.clear();
  for (const win of windows) win.close();
  const data = read();
  delete data.token;
  delete data.github;
  delete data.expiresAt;
  delete data.refreshToken;
  delete data.refreshExpiresAt;
  write(data);
  return info();
}
function validate(provider, handle) {
  if (!["codeforces", "leetcode"].includes(provider))
    throw Error("Unsupported account platform");
  if (typeof handle !== "string" || !/^[A-Za-z0-9_.-]{1,40}$/.test(handle))
    throw Error("Invalid platform username");
}
async function platform(provider, handle) {
  validate(provider, handle);
  if (provider === "codeforces") {
    const user = await request(
      "https://codeforces.com/api/user.info?handles=" +
        encodeURIComponent(handle),
    );
    if (user.status !== "OK" || !user.result?.[0])
      throw Error("Codeforces profile not found");
    const p = user.result[0];
    return {
      handle: p.handle,
      rating: p.rating ?? null,
      rank: p.rank || null,
      maxRating: p.maxRating ?? null,
      url: "https://codeforces.com/profile/" + encodeURIComponent(p.handle),
    };
  }
  const data = await request("https://leetcode.com/graphql/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query:
        "query SemekoProfile($username:String!){matchedUser(username:$username){username profile{ranking} submitStatsGlobal{acSubmissionNum{difficulty count}}} userContestRanking(username:$username){rating globalRanking attendedContestsCount}}",
      variables: { username: handle },
    }),
  });
  const p = data.data?.matchedUser;
  if (!p) throw Error("LeetCode profile not found or unavailable");
  const ranking = data.data.userContestRanking;
  return {
    handle: p.username,
    rank: p.profile?.ranking ?? null,
    rating: ranking?.rating ?? null,
    contestRank: ranking?.globalRanking ?? null,
    solved:
      p.submitStatsGlobal?.acSubmissionNum?.find((x) => x.difficulty === "All")
        ?.count ?? null,
    url: "https://leetcode.com/u/" + encodeURIComponent(p.username) + "/",
  };
}
async function link(provider, handle) {
  const data = read(),
    id = requireLogin(data);
  const profile = await platform(provider, handle);
  const latest = read();
  if (requireLogin(latest) !== id) throw Error("Account changed. Try again.");
  latest.profiles[id] = {
    ...latest.profiles?.[id],
    [provider]: {
      ...profile,
      ownershipVerified: false,
      syncedAt: new Date().toISOString(),
    },
  };
  write(latest);
  return info();
}
function unlink(provider) {
  validate(provider, "valid");
  const data = read(),
    id = requireLogin(data);
  if (data.profiles?.[id]) delete data.profiles[id][provider];
  write(data);
  return info();
}
async function sync(provider) {
  validate(provider, "valid");
  const data = read(),
    id = requireLogin(data),
    handle = data.profiles?.[id]?.[provider]?.handle;
  if (!handle) throw Error("Link a platform profile first");
  const profile = await platform(provider, handle);
  let accepted = [];
  if (provider === "codeforces") {
    const result = await request(
      "https://codeforces.com/api/user.status?handle=" +
        encodeURIComponent(handle) +
        "&from=1&count=200",
    );
    if (result.status !== "OK" || !Array.isArray(result.result))
      throw Error("Could not load Codeforces submissions");
    accepted = result.result
      .filter(
        (s) => s.verdict === "OK" && s.problem?.contestId && s.problem?.index,
      )
      .map((s) => ({
        url: `https://codeforces.com/problemset/problem/${s.problem.contestId}/${s.problem.index}`,
        submissionId: s.id,
        time: s.creationTimeSeconds,
        handle: profile.handle,
      }));
  } else {
    const result = await request("https://leetcode.com/graphql/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query:
          "query SemekoAccepted($username:String!){recentAcSubmissionList(username:$username,limit:20){id titleSlug timestamp}}",
        variables: { username: handle },
      }),
    });
    if (!Array.isArray(result.data?.recentAcSubmissionList))
      throw Error("Could not load LeetCode public submissions");
    accepted = result.data.recentAcSubmissionList.map((s) => ({
      url: `https://leetcode.com/problems/${s.titleSlug}/`,
      submissionId: s.id,
      time: Number(s.timestamp),
      handle: profile.handle,
    }));
  }
  const latest = read();
  if (
    requireLogin(latest) !== id ||
    latest.profiles?.[id]?.[provider]?.handle !== handle
  )
    throw Error("Account changed. Try again.");
  latest.profiles[id][provider] = {
    ...profile,
    ownershipVerified: false,
    syncedAt: new Date().toISOString(),
    accepted,
  };
  write(latest);
  return info();
}
function submissionURL(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw Error("Open an online problem first");
  }
  let match;
  if (
    url.origin === "https://codeforces.com" &&
    (match = /^\/problemset\/problem\/(\d+)\/([A-Za-z]\d*)\/?$/.exec(
      url.pathname,
    ))
  )
    return {
      provider: "codeforces",
      url: `https://codeforces.com/problemset/submit/${match[1]}/${match[2]}`,
    };
  if (
    url.origin === "https://leetcode.com" &&
    (match = /^\/problems\/([a-z0-9-]+)\/?$/.exec(url.pathname))
  )
    return {
      provider: "leetcode",
      url: `https://leetcode.com/problems/${match[1]}/description/`,
    };
  throw Error("Unsupported submission URL");
}
async function openSubmission(value) {
  const data = read(),
    id = requireLogin(data),
    target = submissionURL(value.url);
  if (typeof value.code !== "string" || value.code.length > 2000000)
    throw Error("Invalid solution source");
  clipboard.writeText(value.code);
  if (value.external) {
    await shell.openExternal(target.url);
    return { opened: true };
  }
  const allowed = (url) => {
    try {
      return (
        new URL(url).protocol === "https:" &&
        ["codeforces.com", "leetcode.com"].some(
          (host) =>
            new URL(url).hostname === host ||
            new URL(url).hostname.endsWith("." + host),
        )
      );
    } catch {
      return false;
    }
  };
  const win = new BrowserWindow({
    width: 1150,
    height: 850,
    title: "Semeko - Official submission",
    autoHideMenuBar: true,
    webPreferences: {
      partition: `persist:semeko-${id}-${target.provider}`,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });
  windows.add(win);
  win.on("closed", () => windows.delete(win));
  win.webContents.on("will-navigate", (event, url) => {
    if (!allowed(url)) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (allowed(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  try {
    await win.loadURL(target.url);
  } catch {
    win.close();
    throw Error(
      "Could not open official submission page. Try the browser option.",
    );
  }
  return { opened: true };
}
module.exports = {
  info,
  ensureSession,
  start,
  poll,
  cancel,
  logout,
  link,
  unlink,
  sync,
  platform,
  submissionURL,
  openSubmission,
};
