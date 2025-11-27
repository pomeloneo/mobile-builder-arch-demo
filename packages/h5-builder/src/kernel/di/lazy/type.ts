export type LazyService<T> = {
  readonly _serviceBrand: undefined;

  getInstance: () => Promise<T>;
};
