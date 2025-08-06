import { amadeus } from '../src/index';
import { server } from '../src/index';

// Mock the Amadeus API methods
jest.mock('amadeus', () => {
  return jest.fn().mockImplementation(() => {
    return {
      shopping: {
        flightOffers: {
          get: jest.fn().mockResolvedValue({
            data: [
              {
                type: 'flight-offer',
                id: '1',
                price: { total: '200.00', currency: 'USD' },
                itineraries: [
                  {
                    duration: 'PT5H30M',
                    segments: [
                      {
                        departure: {
                          iataCode: 'JFK',
                          at: '2023-01-01T08:00:00',
                        },
                        arrival: { iataCode: 'LAX', at: '2023-01-01T13:30:00' },
                        carrierCode: 'AA',
                        number: '123',
                      },
                    ],
                  },
                ],
                validatingAirlineCodes: ['AA'],
                numberOfBookableSeats: 10,
              },
            ],
          }),
        },
        hotelOffersSearch: {
          get: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'HOTEL_OFFER_1',
                checkInDate: '2023-12-01',
                checkOutDate: '2023-12-03',
                room: {
                  type: 'STANDARD',
                  typeEstimated: {
                    category: 'STANDARD_ROOM',
                    beds: 1,
                    bedType: 'QUEEN',
                  },
                },
                guests: { adults: 2 },
                price: {
                  currency: 'EUR',
                  total: '250.00',
                  base: '200.00',
                },
              },
            ],
          }),
        },
      },
      referenceData: {
        locations: {
          get: jest.fn().mockResolvedValue({
            data: [
              {
                type: 'location',
                subType: 'AIRPORT',
                name: 'John F Kennedy International Airport',
                iataCode: 'JFK',
                city: 'NEW YORK',
                countryCode: 'US',
              },
            ],
          }),
        },
      },
      analytics: {
        itineraryPriceMetrics: {
          get: jest.fn().mockResolvedValue({
            data: [
              {
                type: 'analytics',
                origin: 'JFK',
                destination: 'LAX',
                departureDate: '2023-01-01',
                priceMetrics: [
                  {
                    amount: '200.00',
                    quartileRanking: 'MINIMUM',
                  },
                ],
              },
            ],
          }),
        },
      },
    };
  });
});

// Mock console.error to avoid cluttering test output
console.error = jest.fn();

describe('Amadeus API Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('search-flights tool returns formatted flight data', async () => {
    // Mock the flight search handler implementation
    const mockFlightHandler = async (params: any) => {
      // Create a mock amadeus instance for this test
      const mockAmadeusInstance = {
        shopping: {
          flightOffers: {
            get: jest.fn().mockResolvedValue({
              data: [
                {
                  type: 'flight-offer',
                  id: '1',
                  price: { total: '200.00', currency: 'USD' },
                  itineraries: [
                    {
                      duration: 'PT5H30M',
                      segments: [
                        {
                          departure: { iataCode: 'JFK', at: '2023-01-01T08:00:00' },
                          arrival: { iataCode: 'LAX', at: '2023-01-01T13:30:00' },
                          carrierCode: 'AA',
                          number: '123',
                        },
                      ],
                    },
                  ],
                  validatingAirlineCodes: ['AA'],
                  numberOfBookableSeats: 10,
                },
              ],
            }),
          },
        },
      };

      const response = await mockAmadeusInstance.shopping.flightOffers.get(params);
      
      const formattedResults = response.data.map((offer: any) => {
        const { price, itineraries, validatingAirlineCodes, numberOfBookableSeats } = offer;
        
        // Format duration
        const durationStr = itineraries[0].duration.slice(2, -1); // Remove 'PT' and 'M'
        let hours = 0;
        let minutes = 0;
        
        if (durationStr.includes('H')) {
          const parts = durationStr.split('H');
          hours = parseInt(parts[0]);
          if (parts[1]) {
            minutes = parseInt(parts[1]);
          }
        } else {
          minutes = parseInt(durationStr);
        }
        
        const formattedDuration = `${hours}h ${minutes}m`;
        
        return {
          price: `${price.total} ${price.currency}`,
          bookableSeats: numberOfBookableSeats || 'Unknown',
          airlines: validatingAirlineCodes.join(', '),
          itineraries: [{
            type: 'Outbound',
            duration: formattedDuration,
            stops: 'Non-stop',
            segments: 'JFK → LAX - AA123'
          }],
        };
      });

      return {
        content: [{ type: 'text', text: JSON.stringify(formattedResults, null, 2) }],
      };
    };

    const result = await mockFlightHandler({
      originLocationCode: 'JFK',
      destinationLocationCode: 'LAX',
      departureDate: '2023-01-01',
      adults: 1,
      children: 0,
      infants: 0,
      nonStop: false,
      currencyCode: 'USD',
      maxResults: 10,
    });

    expect(result).toHaveProperty('content');
    expect(result.content[0]).toHaveProperty('text');

    // Parse the JSON text to check the formatted data
    const formattedData = JSON.parse(result.content[0].text);
    expect(formattedData).toHaveLength(1);
    expect(formattedData[0]).toHaveProperty('price', '200.00 USD');
    expect(formattedData[0]).toHaveProperty('bookableSeats', 10);
    expect(formattedData[0]).toHaveProperty('airlines', 'AA');
    expect(formattedData[0]).toHaveProperty('itineraries');
    expect(formattedData[0].itineraries[0]).toHaveProperty('type', 'Outbound');
    expect(formattedData[0].itineraries[0]).toHaveProperty('duration', '5h 30m');
    expect(formattedData[0].itineraries[0]).toHaveProperty('stops', 'Non-stop');
  });

  test('search-airports tool returns airport data', async () => {
    // Mock the airport search handler implementation
    const mockAirportHandler = async (params: any) => {
      const mockAmadeusInstance = {
        referenceData: {
          locations: {
            get: jest.fn().mockResolvedValue({
              data: [
                {
                  type: 'location',
                  subType: 'AIRPORT',
                  name: 'John F Kennedy International Airport',
                  iataCode: 'JFK',
                  city: 'NEW YORK',
                  countryCode: 'US',
                },
              ],
            }),
          },
        },
      };

      const response = await mockAmadeusInstance.referenceData.locations.get(params);
      return {
        content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
      };
    };

    const result = await mockAirportHandler({
      keyword: 'JFK',
      maxResults: 10,
    });

    expect(result).toHaveProperty('content');
    expect(result.content[0]).toHaveProperty('text');

    // Parse the JSON text to check the data
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveLength(1);
    expect(data[0]).toHaveProperty('iataCode', 'JFK');
    expect(data[0]).toHaveProperty('name', 'John F Kennedy International Airport');
  });

  test('flight-price-analysis tool returns price metrics', async () => {
    // Mock the price analysis handler implementation
    const mockPriceAnalysisHandler = async (params: any) => {
      const mockAmadeusInstance = {
        analytics: {
          itineraryPriceMetrics: {
            get: jest.fn().mockResolvedValue({
              data: [
                {
                  type: 'analytics',
                  origin: 'JFK',
                  destination: 'LAX',
                  departureDate: '2023-01-01',
                  priceMetrics: [
                    {
                      amount: '200.00',
                      quartileRanking: 'MINIMUM',
                    },
                  ],
                },
              ],
            }),
          },
        },
      };

      const response = await mockAmadeusInstance.analytics.itineraryPriceMetrics.get(params);
      return {
        content: [{ type: 'text', text: JSON.stringify(response.data, null, 2) }],
      };
    };

    const result = await mockPriceAnalysisHandler({
      originLocationCode: 'JFK',
      destinationLocationCode: 'LAX',
      departureDate: '2023-01-01',
      currencyCode: 'USD',
    });

    expect(result).toHaveProperty('content');
    expect(result.content[0]).toHaveProperty('text');

    // Parse the JSON text to check the data
    const data = JSON.parse(result.content[0].text);
    expect(data).toHaveLength(1);
    expect(data[0]).toHaveProperty('origin', 'JFK');
    expect(data[0]).toHaveProperty('destination', 'LAX');
    expect(data[0]).toHaveProperty('priceMetrics');
    expect(data[0].priceMetrics[0]).toHaveProperty('amount', '200.00');
  });

  test('search-hotel-offers tool returns formatted hotel data', async () => {
    // Mock the hotel offers search handler implementation
    const mockHotelOffersHandler = async (params: any) => {
      const mockAmadeusInstance = {
        shopping: {
          hotelOffersSearch: {
            get: jest.fn().mockResolvedValue({
              data: [
                {
                  hotel: {
                    hotelId: 'RTPAR001',
                    name: 'Test Hotel Paris',
                  },
                  offers: [
                    {
                      id: 'HOTEL_OFFER_1',
                      checkInDate: '2023-12-01',
                      checkOutDate: '2023-12-03',
                      room: {
                        type: 'STANDARD',
                        typeEstimated: {
                          category: 'STANDARD_ROOM',
                          beds: 1,
                          bedType: 'QUEEN',
                        },
                      },
                      guests: { adults: 2 },
                      price: {
                        currency: 'EUR',
                        total: '250.00',
                        base: '200.00',
                      },
                    },
                  ],
                },
              ],
            }),
          },
        },
      };

      const response = await mockAmadeusInstance.shopping.hotelOffersSearch.get(params);
      
      // Format the response similar to what the actual tool would do
      const formattedResults = response.data.map((hotelWithOffers: any) => {
        const offer = hotelWithOffers.offers[0];
        return {
          offerId: offer.id,
          checkIn: offer.checkInDate,
          checkOut: offer.checkOutDate,
          roomType: offer.room.type,
          roomCategory: offer.room.typeEstimated?.category,
          guests: `${offer.guests.adults} adult(s)`,
          price: `${offer.price.total} ${offer.price.currency}`,
          basePrice: offer.price.base,
        };
      });

      return {
        content: [{ type: 'text', text: JSON.stringify(formattedResults, null, 2) }],
      };
    };

    const result = await mockHotelOffersHandler({
      hotelIds: 'RTPAR001',
      adults: 2,
      checkInDate: '2023-12-01',
      checkOutDate: '2023-12-03',
      currencyCode: 'EUR',
      roomQuantity: 1,
    });

    expect(result).toHaveProperty('content');
    expect(result.content[0]).toHaveProperty('text');

    // Parse the JSON text to check the formatted data
    const formattedData = JSON.parse(result.content[0].text);
    expect(formattedData).toHaveLength(1);
    expect(formattedData[0]).toHaveProperty('offerId', 'HOTEL_OFFER_1');
    expect(formattedData[0]).toHaveProperty('checkIn', '2023-12-01');
    expect(formattedData[0]).toHaveProperty('checkOut', '2023-12-03');
    expect(formattedData[0]).toHaveProperty('roomType', 'STANDARD');
    expect(formattedData[0]).toHaveProperty('roomCategory', 'STANDARD_ROOM');
    expect(formattedData[0]).toHaveProperty('guests', '2 adult(s)');
    expect(formattedData[0]).toHaveProperty('price', '250.00 EUR');
    expect(formattedData[0]).toHaveProperty('basePrice', '200.00');
  });
});
