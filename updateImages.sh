#!/usr/bin/bash

# Pulls all the latest AB docker images.

# Import ENV variables
set -o allexport
source .env
set +o allexport

# Image registry for AppBuilder images (CruGlobal-AI fork default)
AB_IMAGE_REGISTRY="${AB_IMAGE_REGISTRY:-ghcr.io/cruglobal-ai}"

${PLATFORM} image pull \
    ${AB_IMAGE_REGISTRY}/ab-db:${AB_DB_VERSION} \
    docker.io/library/redis:latest \
    ${AB_IMAGE_REGISTRY}/ab-api-sails:${AB_API_SAILS_VERSION} \
    ${AB_IMAGE_REGISTRY}/ab-appbuilder:${AB_APPBUILDER_VERSION} \
    ${AB_IMAGE_REGISTRY}/ab-custom-reports:${AB_CUSTOM_REPORTS_VERSION} \
    ${AB_IMAGE_REGISTRY}/ab-definition-manager:${AB_DEFINITION_MANAGER_VERSION} \
    ${AB_IMAGE_REGISTRY}/ab-file-processor:${AB_FILE_PROCESSOR_VERSION} \
    ${AB_IMAGE_REGISTRY}/ab-log-manager:${AB_LOG_MANAGER_VERSION} \
    ${AB_IMAGE_REGISTRY}/ab-notification-email:${AB_NOTIFICATION_EMAIL_VERSION} \
    ${AB_IMAGE_REGISTRY}/ab-process-manager:${AB_PROCESS_MANAGER_VERSION} \
    ${AB_IMAGE_REGISTRY}/ab-relay:${AB_RELAY_VERSION} \
    ${AB_IMAGE_REGISTRY}/ab-tenant-manager:${AB_TENANT_MANAGER_VERSION} \
    ${AB_IMAGE_REGISTRY}/ab-user-manager:${AB_USER_MANAGER_VERSION} \
    ${AB_IMAGE_REGISTRY}/ab-web:${AB_WEB_VERSION}
