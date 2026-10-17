/**
 * OpenAPI 3.0 specification for TakeMe API
 */

const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'TakeMe API',
    version: '1.0.0',
    description: 'Carpooling sigur pentru navetisti din Iași, România',
    contact: {
      name: 'TakeMe Team',
    },
  },
  servers: [
    { url: 'http://localhost:3001', description: 'Development server' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /auth/login or /auth/register',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          full_name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          gender: { type: 'string', enum: ['M', 'F', 'other'] },
          id_verified: { type: 'boolean' },
          rating_avg: { type: 'number' },
          rating_count: { type: 'integer' },
          points: { type: 'integer' },
        },
      },
      Vehicle: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          plate: { type: 'string', example: 'IS-01-AAA' },
          make: { type: 'string', example: 'Dacia' },
          model: { type: 'string', example: 'Logan' },
          color: { type: 'string', example: 'Alb' },
          seats_total: { type: 'integer', example: 4 },
        },
      },
      Trip: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          route_id: { type: 'integer' },
          date: { type: 'string', format: 'date' },
          departure_at: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] },
          seats_available: { type: 'integer' },
        },
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          trip_id: { type: 'integer' },
          passenger_id: { type: 'integer' },
          pickup_label: { type: 'string' },
          dropoff_label: { type: 'string' },
          price: { type: 'number' },
          status: { type: 'string', enum: ['pending', 'confirmed', 'picked_up', 'arrived', 'alert', 'cancelled'] },
          eta_arrival: { type: 'string', format: 'date-time' },
        },
      },
      SearchResult: {
        type: 'object',
        properties: {
          trip_id: { type: 'integer' },
          driver: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              full_name: { type: 'string' },
              rating_avg: { type: 'number' },
              gender: { type: 'string' },
            },
          },
          vehicle: {
            type: 'object',
            properties: {
              make: { type: 'string' },
              model: { type: 'string' },
              color: { type: 'string' },
              plate: { type: 'string' },
            },
          },
          departure_at: { type: 'string', format: 'date-time' },
          eta_pickup: { type: 'string', format: 'date-time' },
          pickup_distance_m: { type: 'integer' },
          dropoff_distance_m: { type: 'integer' },
          price: { type: 'number' },
          seats_available: { type: 'integer' },
          score: { type: 'number' },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
  paths: {
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Înregistrare utilizator nou',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['full_name', 'email', 'password'],
                properties: {
                  full_name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  password: { type: 'string', minLength: 6 },
                  gender: { type: 'string', enum: ['M', 'F', 'other'] },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Utilizator creat, token JWT returnat' },
          400: { description: 'Date invalide' },
          409: { description: 'Email deja înregistrat' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Autentificare utilizator',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Autentificare reușită, token JWT returnat' },
          401: { description: 'Credențiale invalide' },
        },
      },
    },
    '/me': {
      get: {
        tags: ['Me'],
        summary: 'Profil utilizator curent',
        responses: {
          200: { description: 'Profil utilizator' },
          401: { description: 'Neautentificat' },
        },
      },
    },
    '/me/codes': {
      put: {
        tags: ['Me'],
        summary: 'Actualizare coduri de siguranță (sosire + constrângere)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['arrival_code', 'duress_code'],
                properties: {
                  arrival_code: { type: 'string' },
                  duress_code: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Coduri actualizate' } },
      },
    },
    '/me/verify-id': {
      post: {
        tags: ['Me'],
        summary: 'Verificare identitate (simulat)',
        responses: { 200: { description: 'Identitate marcată ca verificată' } },
      },
    },
    '/me/emergency-contacts': {
      post: {
        tags: ['Me'],
        summary: 'Adaugă contact de urgență',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'phone'],
                properties: {
                  name: { type: 'string' },
                  phone: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Contact adăugat' } },
      },
    },
    '/vehicles': {
      post: {
        tags: ['Vehicles'],
        summary: 'Adaugă vehicul',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['plate', 'make', 'model', 'color', 'seats_total'],
                properties: {
                  plate: { type: 'string' },
                  make: { type: 'string' },
                  model: { type: 'string' },
                  color: { type: 'string' },
                  seats_total: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Vehicul adăugat' } },
      },
    },
    '/vehicles/mine': {
      get: {
        tags: ['Vehicles'],
        summary: 'Vehiculele mele',
        responses: { 200: { description: 'Lista vehiculelor' } },
      },
    },
    '/routes': {
      post: {
        tags: ['Routes'],
        summary: 'Creează rută nouă (cu polyline OSRM)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['start_lat', 'start_lng', 'end_lat', 'end_lng', 'vehicle_id', 'departure_time'],
                properties: {
                  name: { type: 'string' },
                  start_lat: { type: 'number' },
                  start_lng: { type: 'number' },
                  start_label: { type: 'string' },
                  end_lat: { type: 'number' },
                  end_lng: { type: 'number' },
                  end_label: { type: 'string' },
                  vehicle_id: { type: 'integer' },
                  departure_time: { type: 'string', example: '07:30' },
                  days_of_week: { type: 'string', example: '1,2,3,4,5' },
                  price_per_seat: { type: 'number' },
                  price_cap: { type: 'number' },
                  women_only: { type: 'boolean' },
                  verified_only: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Rută creată' } },
      },
    },
    '/routes/mine': {
      get: {
        tags: ['Routes'],
        summary: 'Rutele mele (șofer)',
        responses: { 200: { description: 'Lista rutelor' } },
      },
    },
    '/routes/{id}/trips': {
      post: {
        tags: ['Routes'],
        summary: 'Creează o cursă pentru o dată specifică pe această rută',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['date'],
                properties: { date: { type: 'string', format: 'date' } },
              },
            },
          },
        },
        responses: { 201: { description: 'Cursă creată' } },
      },
    },
    '/search': {
      post: {
        tags: ['Search'],
        summary: 'Caută curse disponibile (algoritm de matching)',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['from', 'to', 'date'],
                properties: {
                  from: {
                    type: 'object',
                    properties: { lat: { type: 'number' }, lng: { type: 'number' } },
                  },
                  to: {
                    type: 'object',
                    properties: { lat: { type: 'number' }, lng: { type: 'number' } },
                  },
                  date: { type: 'string', format: 'date' },
                  time: { type: 'string', example: '07:30' },
                  women_only: { type: 'boolean' },
                  verified_only: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Top 5 curse potrivite sortate după scor',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/SearchResult' } },
              },
            },
          },
        },
      },
    },
    '/trips/{id}/start': {
      post: {
        tags: ['Trips'],
        summary: 'Pornire cursă (șofer)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Cursă pornită' } },
      },
    },
    '/trips/{id}/position': {
      post: {
        tags: ['Trips'],
        summary: 'Actualizare poziție GPS în timp real',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['lat', 'lng'],
                properties: {
                  lat: { type: 'number' },
                  lng: { type: 'number' },
                  speed: { type: 'number', description: 'Viteză în km/h' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Poziție înregistrată' } },
      },
    },
    '/trips/{id}/end': {
      post: {
        tags: ['Trips'],
        summary: 'Finalizare cursă (șofer)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Cursă finalizată' } },
      },
    },
    '/trips/{id}/live': {
      get: {
        tags: ['Trips'],
        summary: 'Vizualizare live cursă (poziție, rezervări, evenimente)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Date live cursă' } },
      },
    },
    '/trips/{id}/safety': {
      get: {
        tags: ['Trips'],
        summary: 'Evenimente de siguranță pentru o cursă',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Lista evenimentelor de siguranță' } },
      },
    },
    '/trips/{id}/sos': {
      post: {
        tags: ['Trips'],
        summary: 'Trimite semnal SOS de urgență',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'SOS înregistrat' } },
      },
    },
    '/trips/{id}/share-link': {
      get: {
        tags: ['Trips'],
        summary: 'Generează link public de partajare a cursei',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'URL de partajare',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { url: { type: 'string' } } },
              },
            },
          },
        },
      },
    },
    '/share/{token}': {
      get: {
        tags: ['Share'],
        summary: 'Vizualizare publică cursă prin token de partajare',
        security: [],
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Informații cursă (public)' },
          401: { description: 'Token invalid sau expirat' },
        },
      },
    },
    '/bookings': {
      post: {
        tags: ['Bookings'],
        summary: 'Creează rezervare',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['trip_id', 'pickup_lat', 'pickup_lng', 'dropoff_lat', 'dropoff_lng'],
                properties: {
                  trip_id: { type: 'integer' },
                  pickup_lat: { type: 'number' },
                  pickup_lng: { type: 'number' },
                  pickup_label: { type: 'string' },
                  dropoff_lat: { type: 'number' },
                  dropoff_lng: { type: 'number' },
                  dropoff_label: { type: 'string' },
                  seat_pref: { type: 'string', enum: ['front', 'back_left', 'back_right'] },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Rezervare confirmată cu ETA și preț calculat' } },
      },
    },
    '/bookings/mine': {
      get: {
        tags: ['Bookings'],
        summary: 'Rezervările mele (pasager)',
        responses: { 200: { description: 'Lista rezervărilor cu info șofer și rută' } },
      },
    },
    '/bookings/{id}/cancel': {
      post: {
        tags: ['Bookings'],
        summary: 'Anulare rezervare',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Rezervare anulată, loc eliberat' } },
      },
    },
    '/bookings/{id}/arrive': {
      post: {
        tags: ['Bookings'],
        summary: 'Confirmare sosire cu cod PIN (cod normal sau cod de constrângere)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code'],
                properties: { code: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Sosire confirmată, puncte acordate' },
          400: { description: 'Cod incorect' },
        },
      },
    },
    '/stats/impact': {
      get: {
        tags: ['Stats'],
        summary: 'Statistici de impact ecologic și economic',
        security: [],
        responses: {
          200: {
            description: 'Statistici agregate',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    total_trips_completed: { type: 'integer' },
                    total_bookings: { type: 'integer' },
                    km_shared: { type: 'number' },
                    co2_saved_kg: { type: 'number' },
                    lei_saved: { type: 'number' },
                    cars_removed_today: { type: 'integer' },
                    popular_corridors: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/reviews': {
      post: {
        tags: ['Reviews'],
        summary: 'Adaugă recenzie pentru un utilizator după o cursă',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['trip_id', 'target_id', 'stars'],
                properties: {
                  trip_id: { type: 'integer' },
                  target_id: { type: 'integer' },
                  stars: { type: 'integer', minimum: 1, maximum: 5 },
                  comment: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Recenzie adăugată, ratingul utilizatorului actualizat' },
          409: { description: 'Recenzie duplicat' },
        },
      },
    },
  },
};

module.exports = openApiSpec;
