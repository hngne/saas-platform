import dayjs from 'dayjs'

export const formatVND = (n: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n)

export const formatDate = (d: string | Date): string =>
  dayjs(d).format('DD/MM/YYYY')

export const formatDateTime = (d: string | Date): string =>
  dayjs(d).format('DD/MM/YYYY HH:mm')

export const formatNumber = (n: number): string =>
  new Intl.NumberFormat('vi-VN').format(n)
