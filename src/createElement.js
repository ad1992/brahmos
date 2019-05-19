import { omit, isClassComponent } from './utils';

export default function createElement (
  element,
  configs,
  children,
) {
  const props = omit(configs, { key: 1, ref: 1 });

  // add children to props
  props.children = children;

  const { key, ref } = configs;
  const _isClassComponent = isClassComponent(element);
  return {
    type: element,
    props,
    key,
    ref: _isClassComponent ? ref : null,
    children,
    __$isWaspComponent$__: true,
    __$isWaspClassComponent$__: _isClassComponent,
    __$isWaspFunctionalComponent$__: !_isClassComponent,
  };
}
