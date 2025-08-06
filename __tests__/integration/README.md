# Hotel Integration Tests

This directory contains comprehensive integration tests for the Amadeus Hotel Search API endpoints that will be added to the MCP server.

## Test Files

### `hotel-search.test.js`
Tests the core hotel search functionality:
- **Hotel search by city**: Find hotels in Paris using city code
- **Hotel search by coordinates**: Find hotels in Manhattan using latitude/longitude
- **Hotel offers search**: Get actual hotel offers with pricing and availability
- **Multi-room scenarios**: Test booking multiple rooms for groups
- **Location-based search**: Find hotels near specific landmarks (Eiffel Tower)
- **Filtering and policies**: Test price ranges and payment policies

### `hotel-booking.test.js` 
Tests advanced hotel booking scenarios:
- **Detailed hotel information**: Retrieve comprehensive hotel details
- **Rate analysis**: Compare different rate types and policies
- **Offer validation**: Simulate pre-booking offer validation
- **Multi-room bookings**: Handle complex group booking scenarios
- **Pricing comparisons**: Compare weekday vs weekend pricing

## Running the Tests

### All hotel tests
```bash
npm run test:hotels
```

### Individual test files
```bash
# Hotel search tests only
npx jest __tests__/integration/hotel-search.test.js

# Hotel booking tests only  
npx jest __tests__/integration/hotel-booking.test.js
```

### With verbose output
```bash
npx jest __tests__/integration/hotel-search.test.js --verbose
```

## Prerequisites

1. **Amadeus API Credentials**: Set up your `.env` file with:
   ```
   AMADEUS_CLIENT_ID=your_client_id
   AMADEUS_CLIENT_SECRET=your_client_secret
   ```

2. **Test Environment**: These tests use the Amadeus test environment, not production.

## Test Structure

Each test follows this pattern:
1. **Setup**: Use `conditionalTest` to skip if credentials are missing
2. **API Call**: Use `makeApiCallWithRetry` for rate limit handling  
3. **Validation**: Check response structure and data integrity
4. **Logging**: Provide detailed console output for debugging

## Expected API Endpoints

The tests assume these Amadeus API endpoints will be implemented:

- `amadeus.referenceData.locations.hotels.byCity.get()` - Find hotels by city
- `amadeus.referenceData.locations.hotels.byGeocode.get()` - Find hotels by coordinates  
- `amadeus.shopping.hotelOffersSearch.get()` - Get hotel offers
- `amadeus.referenceData.locations.hotel.get()` - Get hotel details

## Error Handling

Tests include robust error handling for:
- **Rate limiting**: Automatic retry with exponential backoff
- **Availability issues**: Graceful handling of no-results scenarios
- **API changes**: Flexible validation that adapts to API response variations
- **Network issues**: Timeout and connection error handling

## Test Data

Tests use realistic scenarios:
- **Cities**: Paris (PAR), London (LON), New York (NYC), Barcelona (BCN)
- **Coordinates**: Manhattan, Eiffel Tower vicinity
- **Date ranges**: 14-90 days in the future to ensure valid booking windows
- **Guest configurations**: Single travelers, couples, families, groups

## Integration with MCP Tools

These tests validate the data structures that will be used by:
- `search-hotels-by-location` MCP tool
- `search-hotel-offers` MCP tool  
- `get-hotel-details` MCP tool (future)

## Debugging Tips

1. **Check credentials**: Ensure your API keys are valid and active
2. **Rate limits**: Tests include delays, but manual testing may hit limits faster
3. **Date ranges**: Use future dates (tests automatically calculate these)
4. **Availability**: Hotel offers are dynamic; no results doesn't mean the test failed
5. **Console output**: Tests provide detailed logging for troubleshooting

## Contributing

When adding new hotel tests:
1. Follow the existing `conditionalTest` pattern
2. Use `makeApiCallWithRetry` for all API calls
3. Include detailed console logging
4. Handle cases where no data is available (hotels/offers may not exist)
5. Test with realistic parameters that work in the test environment
