const useBarcodeScannerOutput = jest.fn(({ onBarcodeScanned, onError }) => ({
  __mock: true,
  onBarcodeScanned,
  onError,
}));

module.exports = {
  useBarcodeScannerOutput,
};
