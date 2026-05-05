# Backend Architecture

This project uses an **event-driven microservice architecture**. Services communicate asynchronously through Redis Pub/Sub channels instead of direct API calls, ensuring loose coupling and scalability.

## Event-Driven Architecture

### Core Components
- **Event Bus**: Redis Pub/Sub for asynchronous communication
- **Event Channels**: Dedicated channels for different domains
- **Event Types**: Structured event schemas with metadata
- **Event Handlers**: Service-specific logic for processing events

### Event Channels (from Blueprint)
- `notification.channel`: User notifications and alerts
- `chat.conversation.{conv_id}`: Real-time chat messages per conversation
- `audit.channel`: Fraud detection and admin alerts
- `listing.event`: Listing lifecycle events
- `user.event`: User-related events
- `admin.event`: Administrative actions

### Event Flow Example
```
User creates listing → Listing Service publishes 'listing.created'
                    ↓
AI Service subscribes → Analyzes price → Publishes fraud flags if needed
                    ↓
Notification Service subscribes → Sends alerts to relevant users
```

## Shared Module

The `backend/shared/` directory contains common utilities:

- **events.js**: Redis Pub/Sub setup, event publishing/subscription helpers
- **Predefined channels and event types** from the blueprint

## Service Integration

Each service should:

1. Import the shared events module
2. Initialize Redis on startup: `await initRedis()`
3. Subscribe to relevant channels: `subscribeToEvents(channel, handler)`
4. Publish events when domain events occur: `publishEvent(channel, event)`

## Folder layout

```
backend/
├── shared/                    # Shared utilities
│   ├── events.js             # Event-driven architecture helpers
│   └── package.json
└── services/
    ├── auth-service/
    ├── user-service/
    ├── listing-service/
    ├── chat-service/
    ├── admin-service/
    ├── ai-service/
    ├── search-service/
    └── notification-service/
```

## Local development

- Use the root `.env` for shared local values
- Each service will also use its own service-specific configuration files as needed
- Docker Compose starts PostgreSQL, Redis, Prometheus, and Grafana for the backend environment
