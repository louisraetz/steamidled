import { Component, type ReactNode } from 'react';
import { SettingsLoadError } from './settings-load-error';

interface SettingsErrorBoundaryProps {
  children: ReactNode;
}

interface SettingsErrorBoundaryState {
  failed: boolean;
}

export class SettingsErrorBoundary extends Component<SettingsErrorBoundaryProps, SettingsErrorBoundaryState> {
  state: SettingsErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): SettingsErrorBoundaryState {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <SettingsLoadError />;
    return this.props.children;
  }
}
