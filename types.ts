export interface FormData {
  photos: File[];
  address: string;
  propertyType: 'byt' | 'dům' | 'pozemek';
  layout?: string;
  size?: number;
  highlights?: string;
}

export interface PointOfInterest {
  name: string;
  type: string;
  lat: number;
  lng: number;
}

export interface ListingData {
  title: string;
  description: string;
  estimatedPrice: number;
  location: {
    lat: number;
    lng: number;
  };
  nearbyPois: PointOfInterest[];
}

export interface StagedImage {
  original: string;
  staged: string | null;
  isLoading: boolean;
  error?: string;
}