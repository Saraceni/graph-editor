import 'react';
import { ThreeElements } from '@react-three/fiber';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      group: any;
      line: any;
      mesh: any;
      bufferGeometry: any;
      bufferAttribute: any;
      lineBasicMaterial: any;
      coneGeometry: any;
      meshStandardMaterial: any;
      ambientLight: any;
      pointLight: any;
      axesHelper: any;
    }
  }
}

