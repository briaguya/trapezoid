import React, { Component, useRef, useLayoutEffect, useState } from 'react';
import { Shaders, Node, GLSL } from 'gl-react';
import { Surface } from 'gl-react-dom';
import timeLoop from './GlReactTimeLoop';

const shaders = Shaders.create({
  vignetteColorSeparationDistortion: {
    frag: GLSL`
precision highp float;
varying vec2 uv;
uniform sampler2D t;
uniform vec2 mouse;
uniform float time, amp, freq, moving;
vec2 lookup (vec2 offset, float amp2) {
  return mod(
    uv + amp2 * amp * vec2(
      cos(freq*(uv.x+offset.x)+time),
      sin(freq*(uv.y+offset.x)+time))
      + vec2(
        moving * time/10.0,
        0.0),
    vec2(1.0));
}
void main() {
  float dist = distance(uv, mouse);
  float amp2 = pow(1.0 - dist, 2.0);
  float colorSeparation = 0.02 * mix(amp2, 1.0, 0.5);
  vec2 orientation = vec2(1.0, 0.0);
  float a = (1.0-min(0.95, pow(1.8 * distance(uv, mouse), 4.0) +
  0.5 * pow(distance(fract(50.0 * uv.y), 0.5), 2.0)));
  gl_FragColor = vec4(a * vec3(
    texture2D(t, lookup(colorSeparation * orientation, amp2)).r,
    texture2D(t, lookup(-colorSeparation * orientation, amp2)).g,
    texture2D(t, lookup(vec2(0.0), amp2)).b),
    1.0);
}
`
  }
});

const Vignette = timeLoop(({ children: t, time, mouse }) => (
  <Node
    shader={shaders.vignetteColorSeparationDistortion}
    uniforms={{
      t,
      time: time / 1000, // seconds is better for float precision
      mouse,
      freq: 10 + 2 * Math.sin(0.0007 * time),
      amp: 0.05 + Math.max(0, 0.03 * Math.cos(0.001 * time)),
      moving: 0
    }}
  />
));

const Trapezoid = props => {
  const targetRef = useRef();
  const [dimensions, setDimensions] = useState({});
  const [mouse, setMouse] = useState([0.5, 0.5]);

  // holds the timer for setTimeout and clearInterval
  let movement_timer = null;

  // the number of ms the window size must stay the same size before the
  // dimension state variable is reset
  const RESET_TIMEOUT = 100;

  const test_dimensions = () => {
    // For some reason targetRef.current.getBoundingClientRect was not available
    // I found this worked for me, but unfortunately I can't find the
    // documentation to explain this experience
    if (targetRef.current) {
      setDimensions({
        width: targetRef.current.offsetWidth,
        height: targetRef.current.offsetHeight
      });
    }
  };

  // This sets the dimensions on the first render
  useLayoutEffect(() => {
    test_dimensions();
  }, []);

  // every time the window is resized, the timer is cleared and set again
  // the net effect is the component will only reset after the window size
  // is at rest for the duration set in RESET_TIMEOUT.  This prevents rapid
  // redrawing of the component for more complex components such as charts
  window.addEventListener('resize', () => {
    clearInterval(movement_timer);
    movement_timer = setTimeout(test_dimensions, RESET_TIMEOUT);
  });

  return (
    <div ref={targetRef}>
      <p>{dimensions.width}</p>
      <p>{dimensions.height}</p>
      <Surface
        width={500}
        height={400}
        onMouseMove={e => {
          const rect = e.target.getBoundingClientRect();
          const new_mouse = [
            (e.clientX - rect.left) / rect.width,
            (rect.bottom - e.clientY) / rect.height
          ];
          setMouse(new_mouse);
        }}
      >
        <Vignette mouse={mouse}>https://i.imgur.com/2VP5osy.jpg</Vignette>
      </Surface>
    </div>
  );
};

export default Trapezoid;
