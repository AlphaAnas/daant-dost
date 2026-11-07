import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";

// Flies the camera to a goal; the user grabbing the controls cancels it.
const CameraRig = ({ goal, controls }) => {
  const { camera } = useThree();
  const flying = useRef(false);
  const to = useRef({ position: new Vector3(), target: new Vector3() });

  useEffect(() => {
    if (!goal) return;
    to.current.position.copy(goal.position);
    to.current.target.copy(goal.target);
    flying.current = true;
  }, [goal]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return undefined;
    const stop = () => {
      flying.current = false;
    };
    c.addEventListener("start", stop);
    return () => c.removeEventListener("start", stop);
  }, [controls]);

  useFrame((_, dt) => {
    const c = controls.current;
    if (!flying.current || !c) return;
    const k = 1 - Math.exp(-dt * 3.6);
    camera.position.lerp(to.current.position, k);
    c.target.lerp(to.current.target, k);
    c.update();
    if (
      camera.position.distanceTo(to.current.position) < 0.002 &&
      c.target.distanceTo(to.current.target) < 0.002
    ) {
      flying.current = false;
    }
  });
  return null;
};

export default CameraRig;
