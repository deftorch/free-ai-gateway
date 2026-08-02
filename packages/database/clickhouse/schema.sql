CREATE DATABASE IF NOT EXISTS free_ai_gateway;

CREATE TABLE IF NOT EXISTS free_ai_gateway.gateway_request_logs (
    id UUID,
    gatewayTokenId String,
    modelRequested String,
    modelUsed String,
    keyId String,
    latencyMs UInt32,
    statusCode UInt16,
    promptTokens UInt32,
    completionTokens UInt32,
    timestamp DateTime64(3, 'UTC') DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (timestamp, modelUsed)
PARTITION BY toYYYYMM(timestamp);
