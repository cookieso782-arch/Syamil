export interface PrayerTimeItem {
  name: string;
  arabic: string;
  time: string;
  isPassed: boolean;
  isNext: boolean;
}

export const getTodayPrayerTimes = (now = new Date()): {
  items: PrayerTimeItem[];
  nextPrayer: { name: string; time: string; minutesRemaining: number };
  hijriDate: string;
  gregorianDate: string;
} => {
  // Typical Indonesian prayer times (WIB standard)
  const baseTimes = [
    { name: 'Subuh', arabic: 'الفجر', time: '04:18' },
    { name: 'Terbit', arabic: 'الشروق', time: '05:35' },
    { name: 'Dzuhur', arabic: 'الظهر', time: '11:46' },
    { name: 'Ashar', arabic: 'العصر', time: '15:02' },
    { name: 'Maghrib', arabic: 'المغرب', time: '17:54' },
    { name: 'Isya', arabic: 'العشاء', time: '19:06' },
  ];

  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  let nextPrayerIndex = -1;
  let minDiff = 99999;

  const items: PrayerTimeItem[] = baseTimes.map((p, idx) => {
    const [h, m] = p.time.split(':').map(Number);
    const prayerTotalMinutes = h * 60 + m;
    const diff = prayerTotalMinutes - currentTotalMinutes;
    const isPassed = diff < 0;

    if (diff > 0 && diff < minDiff) {
      minDiff = diff;
      nextPrayerIndex = idx;
    }

    return {
      name: p.name,
      arabic: p.arabic,
      time: p.time,
      isPassed,
      isNext: false,
    };
  });

  if (nextPrayerIndex === -1) {
    // If all passed today, next is Subuh tomorrow
    items[0].isNext = true;
    nextPrayerIndex = 0;
    minDiff = (24 * 60 - currentTotalMinutes) + (4 * 60 + 18);
  } else {
    items[nextPrayerIndex].isNext = true;
  }

  // Indonesian Hijri approximation
  const hijriYear = 1448;
  const hijriMonths = [
    'Muharram', 'Safar', 'Rabiul Awwal', 'Rabiul Akhir',
    'Jumadil Awal', 'Jumadil Akhir', 'Rajab', 'Syaban',
    'Ramadhan', 'Syawal', 'Dzulqadah', 'Dzulhijjah'
  ];
  const hijriDate = `19 Jumadil Awal ${hijriYear} H`;

  const gregorianDate = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return {
    items,
    nextPrayer: {
      name: baseTimes[nextPrayerIndex].name,
      time: baseTimes[nextPrayerIndex].time,
      minutesRemaining: minDiff,
    },
    hijriDate,
    gregorianDate,
  };
};
