import React from 'react';
import { motion } from 'framer-motion';

const DraggablePrediction = ({ prediction }) => {
  return (
    <motion.div
      drag
      dragConstraints={{
        top: -50,
        left: -50,
        right: 50,
        bottom: 50,
      }}
      className="fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg cursor-grab"
    >
      <div className="text-lg font-bold">Safe Cashout</div>
      <div className="text-2xl">{prediction}x</div>
    </motion.div>
  );
};

export default DraggablePrediction;
