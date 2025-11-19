import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './hooks';
import {
  setCurrentStepIndex,
  playAnimation,
  pauseAnimation,
  stepAnimationForward,
  stepAnimationBackward,
  setPathfindingResult,
  setCycleResult,
} from './redux/slices/graphSlice';

export function useAnimationController() {
  const dispatch = useAppDispatch();
  const animationState = useAppSelector((state) => state.graph.animationState);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-advance animation when playing
  useEffect(() => {
    if (!animationState || !animationState.isAnimating || animationState.isPaused) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    const currentIndex = animationState.currentStepIndex;
    const maxIndex = animationState.animationSteps.length - 1;

    // If we've reached the end, pause and set final result
    if (currentIndex >= maxIndex) {
      dispatch(pauseAnimation());
      
      // Set final result based on algorithm type
      const finalStep = animationState.animationSteps[maxIndex];
      if (animationState.algorithmType === 'pathfinding') {
        if (finalStep.path && finalStep.distance !== undefined) {
          dispatch(setPathfindingResult({
            path: finalStep.path,
            distance: finalStep.distance,
            visitedNodes: finalStep.visitedNodes,
            visitedEdges: finalStep.visitedEdges,
            startNode: animationState.startNode!,
            endNode: animationState.endNode!,
          }));
        } else {
          dispatch(setPathfindingResult(null));
        }
      } else if (animationState.algorithmType === 'cycle-detection') {
        if (finalStep.discoveredCycles) {
          // Build cycleMap
          const cycleMap: Record<string, number[]> = {};
          finalStep.discoveredCycles.forEach((cycle, index) => {
            const uniqueNodes = new Set(cycle);
            uniqueNodes.forEach(nodeId => {
              if (!cycleMap[nodeId]) {
                cycleMap[nodeId] = [];
              }
              if (!cycleMap[nodeId].includes(index)) {
                cycleMap[nodeId].push(index);
              }
            });
          });
          dispatch(setCycleResult({
            cycles: finalStep.discoveredCycles,
            cycleMap,
          }));
        }
      }
      return;
    }

    // Schedule next step
    timeoutRef.current = setTimeout(() => {
      dispatch(setCurrentStepIndex(currentIndex + 1));
    }, animationState.animationSpeed);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [animationState, dispatch]);

  const play = useCallback(() => {
    if (animationState) {
      dispatch(playAnimation());
    }
  }, [animationState, dispatch]);

  const pause = useCallback(() => {
    dispatch(pauseAnimation());
  }, [dispatch]);

  const reset = useCallback(() => {
    if (animationState) {
      dispatch(pauseAnimation());
      dispatch(setCurrentStepIndex(0));
    }
  }, [animationState, dispatch]);

  const stepForward = useCallback(() => {
    if (animationState) {
      dispatch(pauseAnimation());
      dispatch(stepAnimationForward());
    }
  }, [animationState, dispatch]);

  const stepBackward = useCallback(() => {
    if (animationState) {
      dispatch(pauseAnimation());
      dispatch(stepAnimationBackward());
    }
  }, [animationState, dispatch]);

  return {
    play,
    pause,
    reset,
    stepForward,
    stepBackward,
    isAnimating: animationState?.isAnimating ?? false,
    isPaused: animationState?.isPaused ?? false,
    currentStep: animationState?.currentStepIndex ?? 0,
    totalSteps: animationState?.animationSteps.length ?? 0,
    animationState,
  };
}

