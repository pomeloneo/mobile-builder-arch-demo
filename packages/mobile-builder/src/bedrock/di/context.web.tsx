import { createContext, createElement, useContext, useMemo, type ReactElement } from 'react';
import { lvAssertNotNil } from '@/bedrock/assert';
import type { IInstantiationService } from './instantiation-service.interface';
import type { ServiceIdentifier, ServicesAccessor } from './base';

interface IProps {
  instantiationService: IInstantiationService;
  children?: React.ReactNode;
}

const Context = createContext<IInstantiationService | null>(null);

/**
 * 组件支持依赖注入上下文
 */
export const InstantiationContext = (props: IProps) => {
  return createElement(
    Context.Provider,
    { value: props.instantiationService },
    props.children,
  ) as ReactElement<any, any>; // 转为jsx.element类型，否则lynx顶不住
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
