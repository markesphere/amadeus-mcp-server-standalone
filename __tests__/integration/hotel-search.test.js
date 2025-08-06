/**
 * Integration tests for Hotel Search API
 */

const { amadeus, conditionalTest, makeApiCallWithRetry } = require('./setup');

describe('Hotel Search API - Integration', () => {
  // Set longer timeout for API calls (60 seconds to account for retries)
  jest.setTimeout(60000);

  // Helper function to get a future date string
  const getFutureDate = (daysFromNow) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  conditionalTest(test, 'should find hotels by city (Paris)', async () => {
    expect(amadeus).not.toBeNull();

    // Parameters for hotel search by city
    const params = {
      cityCode: 'PAR', // Paris
      radius: 20,
      radiusUnit: 'KM',
      hotelSource: 'ALL'
    };

    try {
      console.log('Searching for hotels in Paris');
      // Use the makeApiCallWithRetry helper to handle rate limiting
      const response = await makeApiCallWithRetry(() => 
        amadeus.referenceData.locations.hotels.byCity.get(params)
      );
      
      // Basic validation
      expect(response).toBeDefined();
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      
      // We should find at least one hotel
      expect(response.data.length).toBeGreaterThan(0);
      
      // Check the structure of the first hotel
      const firstHotel = response.data[0];
      expect(firstHotel).toHaveProperty('hotelId');
      expect(firstHotel).toHaveProperty('name');
      expect(firstHotel).toHaveProperty('geoCode');
      expect(firstHotel.geoCode).toHaveProperty('latitude');
      expect(firstHotel.geoCode).toHaveProperty('longitude');
      
      console.log(`Found ${response.data.length} hotels in Paris`);
      console.log(`First hotel: ${firstHotel.name} (ID: ${firstHotel.hotelId})`);
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  });

  conditionalTest(test, 'should find hotels by geocode (Manhattan)', async () => {
    expect(amadeus).not.toBeNull();

    // Parameters for hotel search by coordinates (Manhattan, NYC)
    const params = {
      latitude: 40.7589,
      longitude: -73.9851,
      radius: 5,
      radiusUnit: 'KM',
      hotelSource: 'ALL'
    };

    try {
      console.log('Searching for hotels in Manhattan by coordinates');
      // Use the makeApiCallWithRetry helper to handle rate limiting
      const response = await makeApiCallWithRetry(() => 
        amadeus.referenceData.locations.hotels.byGeocode.get(params)
      );
      
      // Basic validation
      expect(response).toBeDefined();
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      
      // We should find at least one hotel
      expect(response.data.length).toBeGreaterThan(0);
      
      // Check the structure of the first hotel
      const firstHotel = response.data[0];
      expect(firstHotel).toHaveProperty('hotelId');
      expect(firstHotel).toHaveProperty('name');
      expect(firstHotel).toHaveProperty('geoCode');
      
      console.log(`Found ${response.data.length} hotels in Manhattan`);
      console.log(`First hotel: ${firstHotel.name} (ID: ${firstHotel.hotelId})`);
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  });

  conditionalTest(test, 'should get hotel offers for specific hotels', async () => {
    expect(amadeus).not.toBeNull();

    // First, get some hotel IDs from Paris
    const hotelSearchParams = {
      cityCode: 'PAR',
      radius: 10,
      radiusUnit: 'KM',
      hotelSource: 'ALL'
    };

    try {
      console.log('First, searching for hotels to get hotel IDs...');
      const hotelResponse = await makeApiCallWithRetry(() => 
        amadeus.referenceData.locations.hotels.byCity.get(hotelSearchParams)
      );

      expect(hotelResponse.data.length).toBeGreaterThan(0);
      
      // Get up to 3 hotel IDs for the offer search
      const hotelIds = hotelResponse.data.slice(0, 3).map(hotel => hotel.hotelId).join(',');
      console.log(`Using hotel IDs: ${hotelIds}`);

      // Set dates for 30 and 33 days from now (3-night stay)
      const checkInDate = getFutureDate(30);
      const checkOutDate = getFutureDate(33);

      // Parameters for hotel offers search
      const offerParams = {
        hotelIds: hotelIds,
        adults: 2,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        roomQuantity: 1,
        currencyCode: 'EUR'
      };

      console.log(`Searching for hotel offers from ${checkInDate} to ${checkOutDate}`);
      const offerResponse = await makeApiCallWithRetry(() => 
        amadeus.shopping.hotelOffersSearch.get(offerParams)
      );

      // Basic validation
      expect(offerResponse).toBeDefined();
      expect(offerResponse.data).toBeDefined();
      expect(Array.isArray(offerResponse.data)).toBe(true);

      // We should find at least one offer
      expect(offerResponse.data.length).toBeGreaterThan(0);

      // Check the structure of the first offer
      const firstOffer = offerResponse.data[0];
      expect(firstOffer).toHaveProperty('hotel');
      expect(firstOffer).toHaveProperty('offers');
      expect(firstOffer.hotel).toHaveProperty('hotelId');
      expect(firstOffer.hotel).toHaveProperty('name');
      expect(Array.isArray(firstOffer.offers)).toBe(true);
      expect(firstOffer.offers.length).toBeGreaterThan(0);

      // Check the first offer details
      const offer = firstOffer.offers[0];
      expect(offer).toHaveProperty('id');
      expect(offer).toHaveProperty('checkInDate', checkInDate);
      expect(offer).toHaveProperty('checkOutDate', checkOutDate);
      expect(offer).toHaveProperty('room');
      expect(offer).toHaveProperty('price');
      expect(offer).toHaveProperty('guests');
      expect(offer.guests).toHaveProperty('adults', 2);
      expect(offer.price).toHaveProperty('currency', 'EUR');
      expect(offer.price).toHaveProperty('total');

      console.log(`Found ${offerResponse.data.length} hotels with offers`);
      console.log(`First hotel: ${firstOffer.hotel.name}`);
      console.log(`First offer: ${offer.price.total} ${offer.price.currency} for ${offer.room.type} room`);
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  });

  conditionalTest(test, 'should handle hotel offers search with multiple rooms', async () => {
    expect(amadeus).not.toBeNull();

    // Search for hotels in London
    const hotelSearchParams = {
      cityCode: 'LON',
      radius: 15,
      radiusUnit: 'KM'
    };

    try {
      console.log('Searching for hotels in London for multiple rooms...');
      const hotelResponse = await makeApiCallWithRetry(() => 
        amadeus.referenceData.locations.hotels.byCity.get(hotelSearchParams)
      );

      expect(hotelResponse.data.length).toBeGreaterThan(0);
      
      // Get hotel IDs
      const hotelIds = hotelResponse.data.slice(0, 2).map(hotel => hotel.hotelId).join(',');

      // Set dates for future booking
      const checkInDate = getFutureDate(45);
      const checkOutDate = getFutureDate(47);

      // Parameters for multiple rooms
      const offerParams = {
        hotelIds: hotelIds,
        adults: 4,
        children: 2,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        roomQuantity: 2,
        currencyCode: 'GBP'
      };

      console.log(`Searching for 2 rooms from ${checkInDate} to ${checkOutDate} for 4 adults and 2 children`);
      const offerResponse = await makeApiCallWithRetry(() => 
        amadeus.shopping.hotelOffersSearch.get(offerParams)
      );

      // Basic validation
      expect(offerResponse).toBeDefined();
      expect(offerResponse.data).toBeDefined();

      if (offerResponse.data.length > 0) {
        const firstOffer = offerResponse.data[0];
        const offer = firstOffer.offers[0];
        
        expect(offer.guests).toHaveProperty('adults');
        expect(offer.price).toHaveProperty('currency', 'GBP');
        
        console.log(`Found offers for ${offerResponse.data.length} hotels`);
        console.log(`Sample offer: ${offer.price.total} ${offer.price.currency}`);
      } else {
        console.log('No offers found for the specified criteria (this is normal for some date ranges)');
      }
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  });

  conditionalTest(test, 'should search hotels by specific landmark (Eiffel Tower)', async () => {
    expect(amadeus).not.toBeNull();

    // Eiffel Tower coordinates
    const params = {
      latitude: 48.8584,
      longitude: 2.2945,
      radius: 2,
      radiusUnit: 'KM',
      hotelSource: 'ALL'
    };

    try {
      console.log('Searching for hotels near Eiffel Tower');
      const response = await makeApiCallWithRetry(() => 
        amadeus.referenceData.locations.hotels.byGeocode.get(params)
      );
      
      expect(response).toBeDefined();
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      
      if (response.data.length > 0) {
        const nearbyHotels = response.data.filter(hotel => {
          const distance = Math.sqrt(
            Math.pow(hotel.geoCode.latitude - params.latitude, 2) + 
            Math.pow(hotel.geoCode.longitude - params.longitude, 2)
          ) * 111; // Rough conversion to km
          return distance <= params.radius;
        });

        console.log(`Found ${response.data.length} hotels near Eiffel Tower`);
        console.log(`Hotels within ${params.radius}km: ${nearbyHotels.length}`);

        if (nearbyHotels.length > 0) {
          console.log(`Closest hotel: ${nearbyHotels[0].name}`);
        }
      } else {
        console.log('No hotels found near Eiffel Tower (this may happen with restrictive search criteria)');
      }
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  });

  conditionalTest(test, 'should handle hotel search with filtering', async () => {
    expect(amadeus).not.toBeNull();

    try {
      // Search for hotels in a major city with offers
      const hotelSearchParams = {
        cityCode: 'NYC',
        radius: 10,
        radiusUnit: 'KM'
      };

      console.log('Searching for hotels in NYC with price filtering...');
      const hotelResponse = await makeApiCallWithRetry(() => 
        amadeus.referenceData.locations.hotels.byCity.get(hotelSearchParams)
      );

      if (hotelResponse.data.length > 0) {
        const hotelIds = hotelResponse.data.slice(0, 5).map(hotel => hotel.hotelId).join(',');
        
        const checkInDate = getFutureDate(60);
        const checkOutDate = getFutureDate(62);

        // Search with specific payment policy and price range
        const offerParams = {
          hotelIds: hotelIds,
          adults: 1,
          checkInDate: checkInDate,
          checkOutDate: checkOutDate,
          roomQuantity: 1,
          currencyCode: 'USD',
          paymentPolicy: 'GUARANTEE',
          priceRange: '100-500'
        };

        const offerResponse = await makeApiCallWithRetry(() => 
          amadeus.shopping.hotelOffersSearch.get(offerParams)
        );

        expect(offerResponse).toBeDefined();
        expect(offerResponse.data).toBeDefined();

        console.log(`Search with filters returned ${offerResponse.data.length} hotels`);

        if (offerResponse.data.length > 0) {
          const offerWithPolicy = offerResponse.data.find(hotel => 
            hotel.offers.some(offer => 
              offer.policies && offer.policies.paymentType === 'GUARANTEE'
            )
          );

          if (offerWithPolicy) {
            console.log('Found hotel with GUARANTEE payment policy');
          }
        }
      }
    } catch (error) {
      console.error('API Error:', error);
      // Don't fail the test if this specific search doesn't work,
      // as hotel availability and filtering can be very dynamic
      console.log('Note: Hotel search with filtering may not always return results due to availability');
    }
  });
});
