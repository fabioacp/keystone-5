// @flow

import React, { Component, Fragment, type ComponentType, type Node, memo } from 'react';
import ScrollLock from 'react-scrolllock';
import { TransitionProvider } from './transitions';

type GenericFn = any => mixed;
export type CloseType = (event: Event) => void;
type TargetArg = {
  isActive: boolean,
  onClick?: Function,
  onContextMenu?: Function,
  ref: Function,
};

export type ModalHandlerProps = {
  close: CloseType,
  defaultIsOpen: boolean,
  mode: 'click' | 'contextmenu',
  onClose: GenericFn,
  onOpen: GenericFn,
  target: TargetArg => Node,
};
type State = { isOpen: boolean, clientX: number, clientY: number };
type Config = { Transition: (*) => * };

function getDisplayName(C) {
  return `withModalHandlers(${C.displayName || C.name || 'Component'})`;
}
const NOOP = () => {};

let Target = memo(function Target({ isOpen, mode, target, targetRef, open, toggle }) {
  const cloneProps: TargetArg = { isActive: isOpen, ref: targetRef };
  if (mode === 'click') cloneProps.onClick = toggle;
  if (mode === 'contextmenu') cloneProps.onContextMenu = open;
  return target(cloneProps);
});

export default function withModalHandlers(
  WrappedComponent: ComponentType<*>,
  { Transition }: Config
) {
  class IntermediateComponent extends Component<*, State> {
    lastHover: HTMLElement;
    contentNode: HTMLElement;
    targetNode: HTMLElement;
    state = { isOpen: this.props.defaultIsOpen, clientX: 0, clientY: 0 };
    static defaultProps = {
      mode: 'click',
      onClose: NOOP,
      onOpen: NOOP,
    };

    open = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (this.props.mode === 'contextmenu') event.preventDefault();

      const { clientX, clientY } = event;

      this.setState({ isOpen: true, clientX, clientY });

      document.addEventListener('mousedown', this.handleMouseDown);
      document.addEventListener('keydown', this.handleKeyDown, false);
    };
    close = (event: Event) => {
      if (event && event.defaultPrevented) return;

      this.setState({ isOpen: false, clientX: 0, clientY: 0 });

      document.removeEventListener('mousedown', this.handleMouseDown);
      document.removeEventListener('keydown', this.handleKeyDown, false);
    };

    toggle = (event: MouseEvent) => {
      if (this.state.isOpen) {
        this.close(event);
      } else {
        this.open(event);
      }
    };

    handleScroll = (event: WheelEvent) => {
      event.preventDefault();
    };
    handleMouseDown = (event: MouseEvent) => {
      const { target } = event;
      const { isOpen } = this.state;

      // NOTE: Flow doesn't yet have a definition for `SVGElement`
      // $FlowFixMe
      if (!(target instanceof HTMLElement) && !(target instanceof SVGElement)) {
        return;
      }

      // NOTE: Why not use the <Blanket /> component to close?
      // We don't want to interupt the user's flow. Taking this approach allows
      // user to click "through" to other elements and close the popout.
      if (isOpen && !this.contentNode.contains(target) && !this.targetNode.contains(target)) {
        this.close(event);
      }
    };
    handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;

      if (key === 'Escape') {
        this.close(event);
      }
    };

    getTarget = (ref: HTMLElement) => {
      this.targetNode = ref;
    };
    getContent = (ref: HTMLElement) => {
      this.contentNode = ref;
    };

    render() {
      const { mode, onClose, onOpen, target } = this.props;
      const { clientX, clientY, isOpen } = this.state;

      return (
        <Fragment>
          <Target
            targetRef={this.getTarget}
            target={target}
            mode={mode}
            isOpen={isOpen}
            toggle={this.toggle}
            open={this.open}
          />
          {isOpen ? <ScrollLock /> : null}
          <TransitionProvider isOpen={isOpen} onEntered={onOpen} onExited={onClose}>
            {transitionState => (
              <Transition transitionState={transitionState}>
                <WrappedComponent
                  close={this.close}
                  open={this.open}
                  getModalRef={this.getContent}
                  targetNode={this.targetNode}
                  contentNode={this.contentNode}
                  isOpen={isOpen}
                  mouseCoords={{ clientX, clientY }}
                  {...this.props}
                />
              </Transition>
            )}
          </TransitionProvider>
        </Fragment>
      );
    }
  }
  IntermediateComponent.displayName = getDisplayName(WrappedComponent);
  return IntermediateComponent;
}
