export function sanitizeRegexp(regexpresson: string) {
  regexpresson = regexpresson.toString();
  return regexpresson.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function paginator(pageSize: number, pageNo: number) {
  let skip = pageSize * pageNo;
  if (skip < 0) skip = 0;
  return [
    {
      $skip: skip,
    },
    {
      $limit: pageSize,
    },
  ];
}
