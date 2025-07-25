import { JSX } from "react";

interface CanvasProps extends React.CanvasHTMLAttributes<HTMLCanvasElement> {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

const Canvas = ({ canvasRef, ...props }: CanvasProps): JSX.Element => {
  return <canvas hidden ref={canvasRef} {...props} />;
};

export default Canvas;
