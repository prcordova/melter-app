declare module '@react-native-masked-view/masked-view' {
  import type { ReactElement, ReactNode } from 'react';
  import type { ViewProps } from 'react-native';

  export interface MaskedViewProps extends ViewProps {
    maskElement: ReactElement;
    children?: ReactNode;
  }

  const MaskedView: import('react').ComponentType<MaskedViewProps>;
  export default MaskedView;
}
