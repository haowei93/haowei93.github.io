import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const COROS_URLS = {
  login: 'https://teamcnapi.coros.com/account/login',
  list: 'https://teamcnapi.coros.com/activity/query',
  download: 'https://teamcnapi.coros.com/activity/detail/download',
};

const COROS_FILE_TYPES = {
  gpx: 1,
  tcx: 3,
  fit: 4,
};

const DEFAULT_HEADERS = {
  authority: 'teamcnapi.coros.com',
  accept: 'application/json, text/plain, */*',
  'accept-language': 'zh-CN,zh;q=0.9',
  'content-type': 'application/json;charset=UTF-8',
  dnt: '1',
  origin: 'https://t.coros.com',
  referer: 'https://t.coros.com/',
  'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const md5 = (value) =>
  crypto.createHash('md5').update(value, 'utf8').digest('hex');

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const getDownloadedIds = async (folder) => {
  try {
    const files = await fs.readdir(folder);
    return files
      .filter((name) => !name.startsWith('.'))
      .map((name) => name.split('.')[0]);
  } catch (err) {
    return [];
  }
};

const login = async (account, passwordMd5) => {
  const response = await fetch(COROS_URLS.login, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ account, accountType: 2, pwd: passwordMd5 }),
  });

  const data = await response.json();
  const accessToken = data?.data?.accessToken;
  if (!accessToken) {
    throw new Error('Coros login failed.');
  }

  return {
    accesstoken: accessToken,
    cookie: `CPL-coros-region=2; CPL-coros-token=${accessToken}`,
  };
};

const fetchActivityIds = async (headers, onlyRun) => {
  let pageNumber = 1;
  const all = [];
  const modeList = onlyRun ? '100,101,102,103' : '';

  while (true) {
    const url = `${COROS_URLS.list}?&modeList=${modeList}&pageNumber=${pageNumber}&size=20`;
    const response = await fetch(url, { headers });
    const data = await response.json();
    const activities = data?.data?.dataList ?? [];
    if (!activities.length) break;

    for (const activity of activities) {
      if (activity.labelId == null) continue;
      all.push({ labelId: activity.labelId, sportType: activity.sportType });
    }

    pageNumber += 1;
  }

  return all;
};

const downloadActivity = async (headers, labelId, sportType, fileType, folder) => {
  if (sportType === 101 && fileType === 'gpx') {
    return null;
  }

  const downloadUrl = `${COROS_URLS.download}?labelId=${labelId}&sportType=${sportType}&fileType=${COROS_FILE_TYPES[fileType]}`;
  const response = await fetch(downloadUrl, { method: 'POST', headers });
  const data = await response.json();
  const fileUrl = data?.data?.fileUrl;
  if (!fileUrl) return null;

  const filename = path.basename(new URL(fileUrl).pathname);
  const filePath = path.join(folder, filename);

  const fileResponse = await fetch(fileUrl, { headers });
  if (!fileResponse.ok) {
    throw new Error(`Failed to download ${fileUrl}`);
  }

  const buffer = Buffer.from(await fileResponse.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return filename;
};

export const syncCorosActivities = async ({
  account,
  password,
  onlyRun = false,
  fileType = 'fit',
  outputDir,
  concurrency = 6,
}) => {
  if (!COROS_FILE_TYPES[fileType]) {
    throw new Error(`Unsupported file type: ${fileType}`);
  }

  await ensureDir(outputDir);
  const passwordMd5 = md5(password);
  const headers = await login(account, passwordMd5);

  const activities = await fetchActivityIds(headers, onlyRun);
  const downloadedIds = new Set(await getDownloadedIds(outputDir));

  const queue = activities.filter((item) => !downloadedIds.has(String(item.labelId)));

  let index = 0;
  const workers = Array.from({ length: concurrency }).map(async () => {
    while (index < queue.length) {
      const current = queue[index];
      index += 1;
      try {
        await downloadActivity(headers, current.labelId, current.sportType, fileType, outputDir);
      } catch (err) {
        console.error(`Download failed for ${current.labelId}:`, err?.message ?? err);
        await sleep(500);
      }
    }
  });

  await Promise.all(workers);

  return {
    total: activities.length,
    downloaded: queue.length,
  };
};
