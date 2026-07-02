/* The 12 community viewing spots. Circumstances (duration, times, sun altitude,
 * obscuration) are computed live from the Besselian elements — never hardcoded.
 * Descriptions are honest about which spots sit outside the path of totality. */
var SPOTS = [
  {
    id: 'broome', name: 'Broome', region: 'Western Australia · Kimberley coast',
    lat: -17.9614, lng: 122.2359, tz: 8, tzName: 'AWST', seed: 0,
    desc: 'Iconic Cable Beach on the Indian Ocean and deep-red pindan cliffs. Broome sits outside the path — expect a deep partial eclipse with a dramatic crescent Sun over the ocean.',
    weather: 'Dry season — historical clear-sky probability ~85%.'
  },
  {
    id: 'kununurra', name: 'Kununurra', region: 'Western Australia · East Kimberley',
    lat: -15.7736, lng: 128.7386, tz: 8, tzName: 'AWST', seed: 0,
    desc: 'Gateway to the Bungle Bungles and Lake Argyle, with vast open horizons. Inside the path but near its northern edge — drive south toward the central line to more than double your totality.',
    weather: 'Peak dry season — ~90% clear.'
  },
  {
    id: 'devils-marbles', name: 'Devils Marbles / Karlu Karlu', region: 'Northern Territory · Central desert',
    lat: -20.5533, lng: 134.2617, tz: 9.5, tzName: 'ACST', seed: 0,
    desc: 'Sacred boulder field between Alice Springs and Tennant Creek, almost exactly on the central line — nearly five minutes of totality, the longest of any easily named landmark on the path. The black Sun above red spheroidal granite will be one of the most photographed frames on Earth that day.',
    weather: 'Dry winter desert air — excellent odds.'
  },
  {
    id: 'alice-springs', name: 'Alice Springs', region: 'Northern Territory · Red Centre',
    lat: -23.6980, lng: 133.8807, tz: 9.5, tzName: 'ACST', seed: 0,
    desc: 'Base camp for the MacDonnell Ranges and outback observatories. Alice sits south of the path — a ~90% partial here. The Stuart Highway runs straight north into totality (about 300 km to the central line at Devils Marbles).',
    weather: 'Deep-blue winter skies typical.'
  },
  {
    id: 'coober-pedy', name: 'Coober Pedy', region: 'South Australia · Outback',
    lat: -29.0135, lng: 134.7544, tz: 9.5, tzName: 'ACST', seed: 0,
    desc: 'The opal mining capital where much of the town lives underground. Alien lunar landscape with 360° horizons — but it lies well south of the path, so plan it as a stop en route, not eclipse-day base.',
    weather: 'Winter dry. Low humidity.'
  },
  {
    id: 'broken-hill', name: 'Broken Hill', region: 'New South Wales · Outback',
    lat: -31.9539, lng: 141.4539, tz: 10, tzName: 'AEST', seed: 0,
    desc: 'Historic silver-mining city and dark-sky country. Broken Hill misses totality — head up the Silver City Highway toward the path through outback NSW, or east toward the central line near Cobar.',
    weather: 'Reliable winter clear weather, ~75%.'
  },
  {
    id: 'dubbo', name: 'Dubbo', region: 'New South Wales · Central West',
    lat: -32.2569, lng: 148.6010, tz: 10, tzName: 'AEST', seed: 0,
    desc: 'Rural service hub squarely inside the path, with Taronga Western Plains Zoo and the dark-sky sites of Warrumbungle National Park nearby.',
    weather: 'Higher cloud risk than the outback — ~55% clear.'
  },
  {
    id: 'blue-mountains', name: 'Blue Mountains (Katoomba)', region: 'New South Wales · Greater Sydney',
    lat: -33.7120, lng: 150.3119, tz: 10, tzName: 'AEST', seed: 0,
    desc: 'Sandstone escarpment above the Jamison Valley. The Three Sisters and Echo Point promise the eclipsed Sun framed by ancient forest.',
    weather: 'Elevated — watch for winter fog.'
  },
  {
    id: 'sydney', name: 'Sydney Harbour', region: 'New South Wales · CBD',
    lat: -33.8523, lng: 151.2108, tz: 10, tzName: 'AEST', seed: 0,
    desc: 'The first totality over Sydney since 1857. The Royal Botanic Garden sits squarely in the path — the corona hanging above the Harbour Bridge and Opera House in the early afternoon.',
    weather: 'Winter cloud risk ~50%. Book early.'
  },
  {
    id: 'milford-sound', name: 'Milford Sound', region: 'New Zealand · Fiordland',
    lat: -44.6717, lng: 167.9250, tz: 12, tzName: 'NZST', seed: 2,
    desc: 'One of the world’s most dramatic fjords. Totality arrives with the Sun hanging low over Mitre Peak in late-winter afternoon light — a bucket-list frame if the skies cooperate.',
    weather: 'Fiordland is one of Earth’s wettest places. High risk.'
  },
  {
    id: 'queenstown', name: 'Queenstown', region: 'New Zealand · Otago',
    lat: -45.0312, lng: 168.6626, tz: 12, tzName: 'NZST', seed: 0,
    desc: 'Alpine resort town on Lake Wakatipu. A low winter Sun over the Remarkables during totality — rare, cinematic, and cold.',
    weather: 'Winter cloud is significant; mountain vantage helps.'
  },
  {
    id: 'dunedin', name: 'Dunedin', region: 'New Zealand · South Island',
    lat: -45.8788, lng: 170.5028, tz: 12, tzName: 'NZST', seed: 0,
    desc: 'Coastal Otago city — the final major landfall of totality before the shadow races into the South Pacific.',
    weather: 'Coastal cloud common in mid-winter.'
  }
];
if (typeof module === 'object' && module.exports) module.exports = SPOTS;
