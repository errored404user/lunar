import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bioContainsVerificationCode,
  buildRobloxLaunchUri,
  computeVoteRatingPct,
  formatQuickLoginCode,
  mapPresenceToPlayerStatus,
  mapRobloxPresenceType,
  parseFriendIdentifiersInput,
  parsePositiveRobloxId,
  parseRobloxIdList,
  parseRobloxUsernameOrId,
  sanitizeCaptureImageUrl,
  sanitizeCaptureTitle,
  sanitizeRobloSecurityCookie,
  sanitizeRobloxImageUrl,
  sanitizeSearchKeyword,
  sortFriendsByPresence,
} from './robloxApiHelpers';

test('sanitizeRobloxImageUrl permits only HTTPS rbxcdn URLs', () => {
  assert.equal(
    sanitizeRobloxImageUrl('https://tr.rbxcdn.com/180DAY-abc/512/512/Image/Png/noFilter'),
    'https://tr.rbxcdn.com/180DAY-abc/512/512/Image/Png/noFilter',
  );
  assert.equal(sanitizeRobloxImageUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeRobloxImageUrl('http://tr.rbxcdn.com/insecure.png'), null);
  assert.equal(sanitizeRobloxImageUrl('https://evil.example.com/img.png'), null);
});

test('parsePositiveRobloxId and parseRobloxIdList strictly validate numeric IDs', () => {
  assert.equal(parsePositiveRobloxId('4924922222'), 4924922222);
  assert.equal(parsePositiveRobloxId(-5), null);
  assert.equal(parsePositiveRobloxId('49249; DROP TABLE'), null);
  assert.deepEqual(parseRobloxIdList('1686885941, 383310974, bad, 1686885941'), [
    1686885941,
    383310974,
  ]);
});

test('sanitizeSearchKeyword trims control characters and enforces max length', () => {
  assert.equal(sanitizeSearchKeyword('  Physci\n\tTest  ', 12), 'Physci Test');
  assert.equal(sanitizeSearchKeyword('a'.repeat(100), 20).length, 20);
});

test('computeVoteRatingPct computes rounded approval rate cleanly', () => {
  assert.equal(computeVoteRatingPct(90, 10), 90);
  assert.equal(computeVoteRatingPct(8778552, 1439767), 86);
  assert.equal(computeVoteRatingPct(0, 0), 0);
});

test('buildRobloxLaunchUri builds safe roblox:// protocol URIs', () => {
  assert.equal(
    buildRobloxLaunchUri(4924922222),
    'roblox://experiences/start?placeId=4924922222',
  );
  assert.equal(
    buildRobloxLaunchUri(4924922222, 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
    'roblox://experiences/start?placeId=4924922222&gameInstanceId=a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  );
  // Ignores malformed instance IDs
  assert.equal(
    buildRobloxLaunchUri(4924922222, 'bad&injected=1'),
    'roblox://experiences/start?placeId=4924922222',
  );
});

test('parseRobloxUsernameOrId validates Roblox handles and numeric user IDs', () => {
  assert.deepEqual(parseRobloxUsernameOrId('@builderman'), {
    type: 'username',
    username: 'builderman',
  });
  assert.deepEqual(parseRobloxUsernameOrId('  156  '), {
    type: 'id',
    userId: 156,
  });
  assert.deepEqual(parseRobloxUsernameOrId('Lunar_Player1'), {
    type: 'username',
    username: 'Lunar_Player1',
  });
  assert.equal(parseRobloxUsernameOrId('ab'), null);
  assert.equal(parseRobloxUsernameOrId('_leading'), null);
  assert.equal(parseRobloxUsernameOrId('bad__double'), null);
  assert.equal(parseRobloxUsernameOrId('name;drop table'), null);
});

test('mapRobloxPresenceType and mapPresenceToPlayerStatus map presence codes accurately', () => {
  assert.equal(mapRobloxPresenceType(0), 'Offline');
  assert.equal(mapRobloxPresenceType(1), 'Online');
  assert.equal(mapRobloxPresenceType(2), 'In Game');
  assert.equal(mapRobloxPresenceType(3), 'In Studio');
  assert.equal(mapPresenceToPlayerStatus(0), 'offline');
  assert.equal(mapPresenceToPlayerStatus(1), 'online');
  assert.equal(mapPresenceToPlayerStatus(2), 'in-game');
  assert.equal(mapPresenceToPlayerStatus(3), 'online');
});

test('parseFriendIdentifiersInput splits, validates, and deduplicates friend inputs', () => {
  assert.deepEqual(parseFriendIdentifiersInput('@Roblox, builderman, 156, @roblox, bad!'), [
    { type: 'username', username: 'Roblox' },
    { type: 'username', username: 'builderman' },
    { type: 'id', userId: 156 },
  ]);
});

test('sortFriendsByPresence places in-game first, then online, then offline', () => {
  const sorted = sortFriendsByPresence([
    { status: 'offline', displayName: 'Alpha' },
    { status: 'online', displayName: 'Zed' },
    { status: 'in-game', displayName: 'Nova' },
    { status: 'online', displayName: 'Aria' },
  ]);
  assert.deepEqual(
    sorted.map((f) => f.displayName),
    ['Nova', 'Aria', 'Zed', 'Alpha'],
  );
});

test('sanitizeCaptureImageUrl and sanitizeCaptureTitle enforce safe capture inputs', () => {
  assert.equal(
    sanitizeCaptureImageUrl('/src/assets/images/game_arsenal.png'),
    '/src/assets/images/game_arsenal.png',
  );
  assert.equal(
    sanitizeCaptureImageUrl('data:image/png;base64,iVBORw0KGgo='),
    'data:image/png;base64,iVBORw0KGgo=',
  );
  assert.equal(sanitizeCaptureImageUrl('data:image/svg+xml;base64,PHN2Zz4='), null);
  assert.equal(sanitizeCaptureImageUrl('javascript:alert(1)'), null);
  assert.equal(sanitizeCaptureTitle('  My\nClutch\tClip  '), 'My Clutch Clip');
  assert.equal(sanitizeCaptureTitle('   ', 'Fallback'), 'Fallback');
});

test('bioContainsVerificationCode matches case-insensitively inside Roblox bio text', () => {
  assert.equal(
    bioContainsVerificationCode('Hello! lunar-comet-4821 welcome', 'lunar-comet-4821'),
    true,
  );
  assert.equal(
    bioContainsVerificationCode('LUNAR-COMET-4821', 'lunar-comet-4821'),
    true,
  );
  assert.equal(bioContainsVerificationCode('Just a normal bio', 'lunar-comet-4821'), false);
  assert.equal(bioContainsVerificationCode(null, 'lunar-comet-4821'), false);
});

test('sanitizeRobloSecurityCookie blocks header injection and normalizes valid tokens', () => {
  const sample = '_|WARNING:-DO-NOT-SHARE-THIS|--abcdef1234567890ABCDEF';
  assert.equal(sanitizeRobloSecurityCookie(`  .ROBLOSECURITY=${sample}  `), sample);
  assert.equal(sanitizeRobloSecurityCookie(`${sample}\r\nX-Injected: 1`), null);
  assert.equal(sanitizeRobloSecurityCookie(`${sample}; Path=/`), null);
  assert.equal(sanitizeRobloSecurityCookie('too-short'), null);
});

test('formatQuickLoginCode formats 6-character Roblox Quick Login codes', () => {
  assert.equal(formatQuickLoginCode('wmg7fy'), 'WMG-7FY');
  assert.equal(formatQuickLoginCode('JKK-VD4'), 'JKK-VD4');
  assert.equal(formatQuickLoginCode(''), '');
});
