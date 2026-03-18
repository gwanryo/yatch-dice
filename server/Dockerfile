FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /yacht-server .

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=build /yacht-server /yacht-server
EXPOSE 8080
CMD ["/yacht-server"]
