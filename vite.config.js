export default {
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'widget.js',
        chunkFileNames: 'widget.js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
};