import type { JSX } from "react";

interface CanvasProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const Canvas = ({ canvasRef, ...props }: CanvasProps): JSX.Element => {
  return <canvas hidden ref={canvasRef as React.LegacyRef<HTMLCanvasElement>} {...props} />;
};

export default Canvas;
