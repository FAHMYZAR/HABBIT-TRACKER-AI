export const getCurrentTimeHHMM = (): string => {
  const now = new Date();
  return now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export const getStatusForEvent = (startTime: string, endTime: string, currentTime: string, isTomorrow?: boolean): 'UPCOMING' | 'ONGOING' | 'COMPLETED' => {
  // If the task is for tomorrow, it is ALWAYS upcoming regardless of current time
  if (isTomorrow) return 'UPCOMING';

  // Convert HH:mm strings to comparable numbers (e.g., 08:30 -> 830)
  const parseTime = (t: string) => parseInt(t.replace(':', ''), 10);

  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const current = parseTime(currentTime);

  if (current < start) return 'UPCOMING';
  if (current >= start && current <= end) return 'ONGOING';
  return 'COMPLETED';
};

export const formatDuration = (startTime: string, endTime: string): string => {
   const [startH, startM] = startTime.split(':').map(Number);
   const [endH, endM] = endTime.split(':').map(Number);
   
   const startDate = new Date(0, 0, 0, startH, startM);
   const endDate = new Date(0, 0, 0, endH, endM);
   
   let diffMs = endDate.getTime() - startDate.getTime();
   if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000; // Handle overnight

   const hours = Math.floor(diffMs / (1000 * 60 * 60));
   const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

   if (hours > 0) return `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`;
   return `${minutes}m`;
};