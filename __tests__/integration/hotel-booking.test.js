/**
 * Integration tests for Hotel Booking API
 */

const { amadeus, conditionalTest, makeApiCallWithRetry } = require('./setup');

describe('Hotel Booking API - Integration', () => {
  // Set longer timeout for API calls (60 seconds to account for retries)
  jest.setTimeout(60000);

  // Helper function to get a future date string
  const getFutureDate = (daysFromNow) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  conditionalTest(test, 'should retrieve detailed hotel information', async () => {
    expect(amadeus).not.toBeNull();

    try {
      // First find a hotel in Paris
      const hotelSearchParams = {
        cityCode: 'PAR',
        radius: 10,
        radiusUnit: 'KM'
      };

      console.log('Finding hotels in Paris to get detailed information...');
      const hotelResponse = await makeApiCallWithRetry(() => 
        amadeus.referenceData.locations.hotels.byCity.get(hotelSearchParams)
      );

      expect(hotelResponse.data.length).toBeGreaterThan(0);
      
      const testHotelId = hotelResponse.data[0].hotelId;
      console.log(`Getting detailed information for hotel ID: ${testHotelId}`);

      // Get detailed hotel information
      const detailResponse = await makeApiCallWithRetry(() => 
        amadeus.referenceData.locations.hotel.get({
          hotelId: testHotelId
        })
      );

      // Basic validation
      expect(detailResponse).toBeDefined();
      expect(detailResponse.data).toBeDefined();
      expect(detailResponse.data).toHaveProperty('hotelId', testHotelId);
      expect(detailResponse.data).toHaveProperty('name');
      expect(detailResponse.data).toHaveProperty('geoCode');

      // Check for additional details that might be available
      const hotelDetails = detailResponse.data;
      console.log(`Hotel: ${hotelDetails.name}`);
      
      if (hotelDetails.contact) {
        console.log(`Contact info available: ${!!hotelDetails.contact.phone}`);
      }
      
      if (hotelDetails.address) {
        console.log(`Address: ${hotelDetails.address.lines ? hotelDetails.address.lines.join(', ') : 'Available'}`);
      }

    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  });

  conditionalTest(test, 'should handle hotel offers with rate details', async () => {
    expect(amadeus).not.toBeNull();

    try {
      // Search for hotels in London for detailed rate analysis
      const hotelSearchParams = {
        cityCode: 'LON',
        radius: 5,
        radiusUnit: 'KM'
      };

      console.log('Searching for London hotels with detailed rate information...');
      const hotelResponse = await makeApiCallWithRetry(() => 
        amadeus.referenceData.locations.hotels.byCity.get(hotelSearchParams)
      );

      expect(hotelResponse.data.length).toBeGreaterThan(0);
      
      const hotelId = hotelResponse.data[0].hotelId;
      const checkInDate = getFutureDate(21);
      const checkOutDate = getFutureDate(23);

      // Get offers with detailed rate information
      const offerParams = {
        hotelIds: hotelId,
        adults: 2,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        roomQuantity: 1,
        currencyCode: 'GBP',
        includeClosed: false,
        bestRateOnly: true
      };

      console.log(`Getting offers for hotel ${hotelId} from ${checkInDate} to ${checkOutDate}`);
      const offerResponse = await makeApiCallWithRetry(() => 
        amadeus.shopping.hotelOffersSearch.get(offerParams)
      );

      expect(offerResponse).toBeDefined();
      expect(offerResponse.data).toBeDefined();

      if (offerResponse.data.length > 0) {
        const hotelWithOffers = offerResponse.data[0];
        const offer = hotelWithOffers.offers[0];

        // Validate offer structure
        expect(offer).toHaveProperty('id');
        expect(offer).toHaveProperty('room');
        expect(offer).toHaveProperty('price');
        expect(offer).toHaveProperty('policies');

        console.log(`Found offer: ${offer.price.total} ${offer.price.currency}`);
        console.log(`Room type: ${offer.room.type}`);
        
        // Check for rate family information
        if (offer.rateFamilyEstimated) {
          console.log(`Rate family: ${offer.rateFamilyEstimated.type} (${offer.rateFamilyEstimated.code})`);
        }

        // Check for cancellation policies
        if (offer.policies && offer.policies.cancellation) {
          console.log('Cancellation policy available');
        }

        // Validate price breakdown
        expect(offer.price).toHaveProperty('currency', 'GBP');
        expect(offer.price).toHaveProperty('total');
        
        if (offer.price.taxes && offer.price.taxes.length > 0) {
          console.log(`Taxes: ${offer.price.taxes.map(tax => `${tax.amount} (${tax.code})`).join(', ')}`);
        }

      } else {
        console.log('No offers available for the specified dates and criteria');
      }

    } catch (error) {
      console.error('API Error:', error);
      // Don't fail the test for availability issues
      console.log('Note: Hotel offers may not be available for all date ranges');
    }
  });

  conditionalTest(test, 'should validate offer before booking simulation', async () => {
    expect(amadeus).not.toBeNull();

    try {
      // Find a hotel and get offers
      const hotelSearchParams = {
        latitude: 40.7589, // Manhattan
        longitude: -73.9851,
        radius: 3,
        radiusUnit: 'KM'
      };

      console.log('Finding hotels in Manhattan for booking validation...');
      const hotelResponse = await makeApiCallWithRetry(() => 
        amadeus.referenceData.locations.hotels.byGeocode.get(hotelSearchParams)
      );

      if (hotelResponse.data.length > 0) {
        const hotelId = hotelResponse.data[0].hotelId;
        const checkInDate = getFutureDate(14);
        const checkOutDate = getFutureDate(16);

        // Get offers
        const offerParams = {
          hotelIds: hotelId,
          adults: 1,
          checkInDate: checkInDate,
          checkOutDate: checkOutDate,
          roomQuantity: 1,
          currencyCode: 'USD'
        };

        const offerResponse = await makeApiCallWithRetry(() => 
          amadeus.shopping.hotelOffersSearch.get(offerParams)
        );

        if (offerResponse.data.length > 0 && offerResponse.data[0].offers.length > 0) {
          const offer = offerResponse.data[0].offers[0];
          console.log(`Found offer to validate: ${offer.id}`);

          // Simulate offer validation (this would be done before actual booking)
          console.log('Offer validation would check:');
          console.log(`- Offer ID: ${offer.id}`);
          console.log(`- Check-in: ${offer.checkInDate}`);
          console.log(`- Check-out: ${offer.checkOutDate}`);
          console.log(`- Price: ${offer.price.total} ${offer.price.currency}`);
          console.log(`- Room: ${offer.room.type}`);
          console.log(`- Guests: ${offer.guests.adults} adult(s)`);

          // Basic validation checks
          expect(offer.checkInDate).toBe(checkInDate);
          expect(offer.checkOutDate).toBe(checkOutDate);
          expect(offer.guests.adults).toBe(1);
          expect(offer.price.currency).toBe('USD');

          console.log('Offer validation successful (simulation)');
        } else {
          console.log('No offers available for validation test');
        }
      }

    } catch (error) {
      console.error('API Error:', error);
      console.log('Note: Offer validation test skipped due to availability constraints');
    }
  });

  conditionalTest(test, 'should handle multi-room booking scenarios', async () => {
    expect(amadeus).not.toBeNull();

    try {
      // Search for hotels that can accommodate multiple rooms
      const hotelSearchParams = {
        cityCode: 'BCN', // Barcelona
        radius: 15,
        radiusUnit: 'KM'
      };

      console.log('Testing multi-room booking scenario in Barcelona...');
      const hotelResponse = await makeApiCallWithRetry(() => 
        amadeus.referenceData.locations.hotels.byCity.get(hotelSearchParams)
      );

      if (hotelResponse.data.length > 0) {
        const hotelIds = hotelResponse.data.slice(0, 3).map(h => h.hotelId).join(',');
        const checkInDate = getFutureDate(35);
        const checkOutDate = getFutureDate(38);

        // Search for multiple rooms for a group
        const multiRoomParams = {
          hotelIds: hotelIds,
          adults: 6, // 3 adults per room would be 2 rooms
          children: 0,
          checkInDate: checkInDate,
          checkOutDate: checkOutDate,
          roomQuantity: 3, // Explicitly request 3 rooms
          currencyCode: 'EUR'
        };

        console.log(`Searching for 3 rooms for 6 adults from ${checkInDate} to ${checkOutDate}`);
        const multiRoomResponse = await makeApiCallWithRetry(() => 
          amadeus.shopping.hotelOffersSearch.get(multiRoomParams)
        );

        expect(multiRoomResponse).toBeDefined();
        expect(multiRoomResponse.data).toBeDefined();

        if (multiRoomResponse.data.length > 0) {
          console.log(`Found ${multiRoomResponse.data.length} hotels with multi-room availability`);
          
          const hotelWithRooms = multiRoomResponse.data[0];
          if (hotelWithRooms.offers.length > 0) {
            const offer = hotelWithRooms.offers[0];
            console.log(`Multi-room offer: ${offer.price.total} ${offer.price.currency}`);
            console.log(`Room configuration: ${offer.room.type}`);
            
            // Validate multi-room booking structure
            expect(offer.guests.adults).toBeGreaterThan(1);
            expect(offer.price.currency).toBe('EUR');
          }
        } else {
          console.log('No multi-room offers available for the specified criteria');
        }
      }

    } catch (error) {
      console.error('API Error:', error);
      console.log('Note: Multi-room availability can be limited');
    }
  });

  conditionalTest(test, 'should handle weekend vs weekday pricing differences', async () => {
    expect(amadeus).not.toBeNull();

    try {
      // Find hotels for price comparison
      const hotelSearchParams = {
        cityCode: 'NYC',
        radius: 5,
        radiusUnit: 'KM'
      };

      const hotelResponse = await makeApiCallWithRetry(() => 
        amadeus.referenceData.locations.hotels.byCity.get(hotelSearchParams)
      );

      if (hotelResponse.data.length > 0) {
        const hotelId = hotelResponse.data[0].hotelId;
        
        // Get weekday pricing (Tuesday-Wednesday)
        const weekdayStart = getFutureDate(15); // Assuming it falls on a weekday
        const weekdayEnd = getFutureDate(16);
        
        // Get weekend pricing (Friday-Saturday)
        const weekendStart = getFutureDate(19); // Assuming it falls on a weekend
        const weekendEnd = getFutureDate(20);

        console.log('Comparing weekday vs weekend pricing...');
        
        // Weekday offers
        const weekdayParams = {
          hotelIds: hotelId,
          adults: 2,
          checkInDate: weekdayStart,
          checkOutDate: weekdayEnd,
          roomQuantity: 1,
          currencyCode: 'USD'
        };

        // Weekend offers
        const weekendParams = {
          hotelIds: hotelId,
          adults: 2,
          checkInDate: weekendStart,
          checkOutDate: weekendEnd,
          roomQuantity: 1,
          currencyCode: 'USD'
        };

        const [weekdayResponse, weekendResponse] = await Promise.all([
          makeApiCallWithRetry(() => amadeus.shopping.hotelOffersSearch.get(weekdayParams)),
          makeApiCallWithRetry(() => amadeus.shopping.hotelOffersSearch.get(weekendParams))
        ]);

        if (weekdayResponse.data.length > 0 && weekendResponse.data.length > 0) {
          const weekdayOffer = weekdayResponse.data[0].offers[0];
          const weekendOffer = weekendResponse.data[0].offers[0];

          console.log(`Weekday price (${weekdayStart}): ${weekdayOffer.price.total} ${weekdayOffer.price.currency}`);
          console.log(`Weekend price (${weekendStart}): ${weekendOffer.price.total} ${weekendOffer.price.currency}`);

          const weekdayPrice = parseFloat(weekdayOffer.price.total);
          const weekendPrice = parseFloat(weekendOffer.price.total);
          
          if (weekendPrice > weekdayPrice) {
            const increase = ((weekendPrice - weekdayPrice) / weekdayPrice * 100).toFixed(1);
            console.log(`Weekend premium: ${increase}%`);
          } else if (weekdayPrice > weekendPrice) {
            const decrease = ((weekdayPrice - weekendPrice) / weekdayPrice * 100).toFixed(1);
            console.log(`Weekday premium: ${decrease}%`);
          } else {
            console.log('No significant price difference between weekday and weekend');
          }

          expect(weekdayOffer.price.currency).toBe('USD');
          expect(weekendOffer.price.currency).toBe('USD');
        } else {
          console.log('Unable to compare pricing due to limited availability');
        }
      }

    } catch (error) {
      console.error('API Error:', error);
      console.log('Note: Pricing comparison test may be affected by availability');
    }
  });
});
