export type ZillowHouseData = {
  images: string[];
  city: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: string;
  streetAddress: string;
  scores: {
    walkScore: number | null;
    bikeScore: number | null;
    transitScore: number | null;
  };
  zestimate: number | null;
  rentZestimate: number | null;
  daysOnZillow: number;
  livingArea: string;
  state: string;
  zillowHouseUrl: string;
  latitude: number;
  longitude: number;
};
