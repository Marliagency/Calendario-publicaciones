import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';
import { es } from 'date-fns/locale';

const opts = { locale: es, weekStartsOn: 1 as const };

export const dateUtils = {
  startOfWeek: (d: Date) => startOfWeek(d, opts),
  endOfWeek: (d: Date) => endOfWeek(d, opts),
  weekDays: (d: Date) =>
    eachDayOfInterval({ start: startOfWeek(d, opts), end: endOfWeek(d, opts) }),
  monthDays: (d: Date) =>
    eachDayOfInterval({
      start: startOfWeek(startOfMonth(d), opts),
      end: endOfWeek(endOfMonth(d), opts),
    }),
  fmt: (d: Date | string, pattern: string) =>
    format(typeof d === 'string' ? parseISO(d) : d, pattern, opts),
  fmtShort: (d: Date) => format(d, 'EEE d', opts),
  fmtTime: (d: Date | string) => format(typeof d === 'string' ? parseISO(d) : d, 'HH:mm'),
  fmtTitle: (d: Date) => format(d, "MMMM 'de' yyyy", opts),
  addDays,
  subDays,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
  parseISO,
};
