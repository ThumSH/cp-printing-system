export interface Components {
  front: boolean; back: boolean; sleeve: boolean; 
  waistBand: boolean; pocket: boolean; other: boolean;
}

export interface DevRecord {
  id: string;
  customerName: string; styleNo: string; season: string; printTechnique: string;
  washingStandard: string; bodyColour: string; printColour: string; printColourQty: string;
  sampleOrderedDate: string; sampleDeliveryDate: string;
  artworkName: string | null;
  components: Components;
}