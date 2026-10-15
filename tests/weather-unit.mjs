import { pickHour, weatherLabel, eligible } from '../../bb-player-app/worker/weather.js';
import assert from 'node:assert';
const H = 3600e3, played = Date.parse('2026-10-19T02:00:00Z'); // 7:00 PM PDT Oct 18
assert.equal(eligible(played, played + 2*H, played + 3*H), true, 'posted 2h after');
assert.equal(eligible(played, played + 23.9*H, played + 23.9*H), true, 'posted at 23.9h');
assert.equal(eligible(played, played + 25*H, played + 25*H), false, 'posted at 25h');
assert.equal(eligible(played, played - 1*H, played + 1*H), false, 'posted before the match (created earlier)');
assert.equal(eligible(played + 5*H, played, played), false, 'court time in the future');
const hours = [0,1,2,3].map(i => ({ interval: { startTime: new Date(played - 2*H + i*H).toISOString(), endTime: new Date(played - H + i*H).toISOString() }, temperature: { degrees: 58 + i, unit: 'FAHRENHEIT' }, wind: { speed: { value: 7.6 + i, unit: 'MILES_PER_HOUR' } } }));
assert.equal(weatherLabel(pickHour(hours, new Date(played))), '60°F · Wind 10 mph', 'hour containing match');
assert.equal(pickHour(hours, new Date(played + 10*H)), null, 'no hour within 1h');
assert.equal(weatherLabel({ temperature: {} }), null);
console.log('weather unit tests: 8/8 pass');
