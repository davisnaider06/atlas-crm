FROM mcr.microsoft.com/dotnet/sdk:10.0-preview AS build
WORKDIR /src

COPY AtlasCRM.sln ./
COPY src/Domain/AtlasCRM.Domain.csproj src/Domain/
COPY src/Application/AtlasCRM.Application.csproj src/Application/
COPY src/Infrastructure/AtlasCRM.Infrastructure.csproj src/Infrastructure/
COPY src/API/AtlasCRM.API.csproj src/API/

RUN dotnet restore src/API/AtlasCRM.API.csproj

COPY src ./src
RUN dotnet publish src/API/AtlasCRM.API.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0-preview
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "AtlasCRM.API.dll"]
