import { HttpError } from "./error-handler.js";

function readPositiveInteger(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined;

  if (typeof value === "string" && /^[1-9]\d*$/.test(value)) {
    const number = Number(value);
    if (Number.isSafeInteger(number)) return number;
  }

  throw new HttpError(
    400,
    "INVALID_PAGINATION",
    `${name} debe ser un entero positivo`,
  );
}

export function readPagination(query: { page?: unknown; limit?: unknown }) {
  return {
    page: readPositiveInteger(query.page, "page"),
    limit: readPositiveInteger(query.limit, "limit"),
  };
}


type ListOptions<T> = {
  page?: number;
  limit?: number;
  filter?: (item: T) => boolean;
  compare?: (a: T, b: T) => number;
};

export function queryList<T>(
  items: readonly T[],
  { page = 1, limit = 10, filter, compare }: ListOptions<T> = {},
) {
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new HttpError(
      400,
      "INVALID_PAGINATION",
      "La página debe ser un entero positivo y el límite debe estar entre 1 y 100",
    );
  }

  const result = filter ? items.filter(filter) : [...items];

  if (compare) {
    result.sort(compare);
  }

  const total = result.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;

  return {
    items: page > totalPages ? [] : result.slice(start, start + limit),
    pagination: { page, limit, total, totalPages },
  };
}