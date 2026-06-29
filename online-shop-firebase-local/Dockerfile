# Use eclipse-temurin to get a clean JRE 21
FROM eclipse-temurin:21-jre AS java-base

# Use node:22-slim as the final runtime image
FROM node:22-slim

# Copy Java JRE 21 from the temurin stage
COPY --from=java-base /opt/java/openjdk /opt/java/openjdk

# Set Java environment variables
ENV JAVA_HOME=/opt/java/openjdk
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# Install firebase-tools and pnpm globally
RUN npm install -g firebase-tools pnpm

WORKDIR /srv/online-shop/online-shop-firebase-local

# Copy configuration and rules files
COPY firebase.json firestore.rules storage.rules ./

# Expose ports:
# 4000: Emulator Suite UI
# 4400: Emulator Hub
# 5001: Functions Emulator
# 8080: Firestore Emulator
# 9099: Auth Emulator
# 9199: Storage Emulator
EXPOSE 4000 4400 5001 8080 9099 9199

# Start emulators. Data is imported from ./data if present, and exported back to ./data on shutdown.
CMD ["firebase", "emulators:start", "--project", "online-shop-bf396", "--import=./data", "--export-on-exit"]




