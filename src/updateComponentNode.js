import functionalComponentInstance from './functionalComponentInstance';
import { PureComponent } from './Component';
import { mergeState } from './utils';

import updateNode from './updateNode';

function renderWithErrorBoundaries (part, node, forceRender, handleError) {
  const {
    type: Component,
    componentInstance,
    props,
    __$isBrahmosClassComponent$__: isClassComponent,
  } = node;

  // render nodes
  const renderNodes = componentInstance.__render(props);

  try {
    /**
     * store lastNode into the component instance so later
     * if the component does not have to update it should return the stored lastNode
     */
    componentInstance.__lastNode = updateNode(part, renderNodes, null, forceRender);
  } catch (err) {
    if (isClassComponent && handleError) {
      let { state, componentDidCatch } = componentInstance;

      /**
       * call getDerivedStateFromError if there is new state based on error try to rerender
       */

      const { getDerivedStateFromError } = Component;

      const errorState = getDerivedStateFromError ? getDerivedStateFromError(props, state) : null;

      // if there is any error state try rendering component again
      if (errorState) {
        state = mergeState(state, errorState);
        componentInstance.state = state;
        renderWithErrorBoundaries(part, node, forceRender, false);
      }

      // call componentDidCatch lifecycle with error
      if (componentDidCatch) componentDidCatch.call(componentInstance, err);

      // if both componentDidCatch and getDerivedStateFromError is not defined throw error
      if (!(componentDidCatch || getDerivedStateFromError)) throw err;
    } else {
      throw err;
    }
  }
}

/**
 * Update component node
 */
export default function updateComponentNode (part, node, oldNode, forceRender) {
  const {
    type: Component,
    props,
    __$isBrahmosClassComponent$__: isClassComponent,
    __$isBrahmosFunctionalComponent$__: isFunctionalComponent,
  } = node;

  let firstRender = false;
  let shouldUpdate = true;

  /** If Component instance is not present on node create a new instance */
  let { componentInstance } = node;

  if (!componentInstance) {
    // create an instance of the component
    componentInstance = isFunctionalComponent
      ? functionalComponentInstance(Component)
      : new Component(props);

    /**
       * store the part and node information on the component instance,
       * so every component have the createElement instance of self and
       * the information of where it has to render
       */
    componentInstance.__part = part;
    componentInstance.__componentNode = node;

    // keep the reference of instance to the node.
    node.componentInstance = componentInstance;

    firstRender = true;
  }

  // call the life cycle methods for class component, which comes before rendering
  if (isClassComponent) {
    const { __unCommittedState, shouldComponentUpdate } = componentInstance;
    const { getDerivedStateFromProps } = Component;

    let state = __unCommittedState || componentInstance.state;
    // call getDerivedStateFromProps hook with the unCommitted state
    if (getDerivedStateFromProps) {
      state = mergeState(
        state,
        getDerivedStateFromProps(props, state)
      );
    }

    /**
       * check if component is instance of PureComponent, if yes then,
       * do shallow check for props and states
       */

    if (componentInstance instanceof PureComponent) {
      shouldUpdate = state !== componentInstance.state || props !== componentInstance.props;
    }

    /**
       * check if component should update or not. If PureComponent shallow check has already
       * marked component to not update then we don't have to call shouldComponentUpdate
       * Also we shouldn't call shouldComponentUpdate on first render
       */
    if (shouldComponentUpdate && shouldUpdate && !firstRender) {
      shouldUpdate = shouldComponentUpdate.call(componentInstance, props, state);
    }

    // set the new state and props and reset uncommitted state
    componentInstance.state = state;
    componentInstance.props = props;
    componentInstance.__unCommittedState = undefined;
  }

  // update a component update only if it can be updated based on shouldComponentUpdate
  if (shouldUpdate) {
    renderWithErrorBoundaries(part, node, forceRender, true);
  }

  // return the component's lastNode
  return componentInstance.__lastNode;
}
