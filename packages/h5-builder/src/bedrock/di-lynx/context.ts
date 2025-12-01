// TODO: 依赖 @byted-lynx/react, lynx demo 阶段验证
import { createContext, createElement, useContext, useMemo } from '@byted-lynx/react';
import type { IInstantiationService, ServiceIdentifier, ServicesAccessor } from '@/bedrock/di';
import { lvAssertNotNil } from '@/bedrock/assert';

interface IProps {
  instantiationService: IInstantiationService;
  children?: React.ReactNode;
}

const Context = createContext<IInstantiationService | null>(null);

/**
 * 组件支持依赖注入上下文
 */
export const InstantiationContext = (props: IProps) => {
  return createElement(Context.Provider, { value: props.instantiationService }, props.children);
};

/**
 * 获取服务的hook
 * @param identifier 服务标识符
 * @returns 对应服务
 */
export function useService<T>(identifier: ServiceIdentifier<T>): T {
  const instantiationService = useContext(Context);
  lvAssertNotNil(instantiationService, 'react components need service context.');
  const service = useMemo(
    () =>
      instantiationService.invokeFunction((servicesAccessor: ServicesAccessor) =>
        servicesAccessor.get(identifier),
      ),
    [instantiationService, identifier],
  );

  return service;
}
