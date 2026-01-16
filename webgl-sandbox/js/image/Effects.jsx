import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import { RenderImage } from './RenderImage.js';

export function Effects({ effects }) {
  const [effectState, setEffectState] = useState(effects);

  useEffect(() => {
    setEffectState(effects);
  }, [effects]);

  const handleChange = (name) => {
    const renderer = new RenderImage();

    setEffectState((prev) => {
      const newEffects = prev.map((effect) => (effect.name === name ? { ...effect, on: !effect.on } : effect));
      renderer.drawEffects(newEffects.filter((effect) => effect.on));
      return newEffects;
    });
  };

  return (
    <div className="effects-panel">
      <h3 className="effects-title">Image Effects</h3>
      {effectState.map((effect) => (
        <label key={effect.name} className="effect-checkbox">
          <input type="checkbox" checked={effect.on} onChange={() => handleChange(effect.name)} />
          <span className="effect-name">{effect.name}</span>
        </label>
      ))}
    </div>
  );
}

Effects.propTypes = {
  effects: PropTypes.array,
};
