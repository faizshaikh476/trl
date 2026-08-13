export const INDIA_TIME_ZONE = "Asia/Kolkata";

const defaultDateTimeOptions: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

const defaultDateOptions: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "short",
  year: "numeric",
};

export function formatIndiaDateTime(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = defaultDateTimeOptions,
) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-IN", {
    ...options,
    timeZone: INDIA_TIME_ZONE,
  }).format(date);
}

export function formatIndiaDate(value: string | Date | null | undefined) {
  return formatIndiaDateTime(value, defaultDateOptions);
}
