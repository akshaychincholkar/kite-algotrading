# Kite AlgoTrading Platform

A comprehensive algorithmic trading platform built with Django REST Framework and React, featuring automated trading strategies, real-time market screening, and portfolio management.

## 🚀 Features

- **Automated Trading**: GTT (Good Till Triggered) and OCO (One Cancels Other) order support
- **Market Screening**: Real-time stock screening with customizable criteria
- **Portfolio Management**: Track ROI, manage positions, and analyze performance
- **Kite Connect Integration**: Direct integration with Zerodha Kite API
- **Real-time Data**: Live market data and trade execution
- **Web Interface**: Modern React frontend with responsive design

## 🏗️ Architecture

- **Backend**: Django REST Framework with PostgreSQL
- **Frontend**: React with Vite build system
- **API Integration**: Zerodha Kite Connect API
- **Database**: PostgreSQL with separate local/production configurations
- **Deployment**: Docker-ready with Render.com support

## 📋 Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 13+
- Zerodha Kite Connect API credentials

## 🔧 Quick Start

### 1. Clone Repository

```bash
git clone <repository-url>
cd kite-algotrading
```

### 2. Database Setup

```bash
# Test database connection
python test_db_connection.py

# Set up database and run migrations
python setup_database.py
```

### 3. Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Configure environment
cp ../.env.local .env
# Edit .env with your database and API credentials

# Start Django server
python manage.py runserver
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## 🗄️ Database Configuration

The application supports both local and external PostgreSQL databases:

### Local Development
```bash
# .env configuration
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=admin@123
DB_HOST=localhost
DB_PORT=5432
```

### Production (Render.com/External)
```bash
# .env configuration
DATABASE_URL=postgresql://user:password@host:port/database
```

📖 **Detailed Setup**: See [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md)

## 🐳 Docker Deployment

### Development
```bash
docker-compose up --build
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up --build
```

## 🌐 API Endpoints

- `/api/trading/` - Trading operations and order management
- `/api/screener/` - Market screening functionality
- `/api/user-roi/` - Portfolio and ROI tracking
- `/admin/` - Django admin interface

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection URL | Production |
| `SECRET_KEY` | Django secret key | Yes |
| `DEBUG` | Enable debug mode | Development |
| `KITE_API_KEY` | Zerodha API key | Yes |
| `KITE_API_SECRET` | Zerodha API secret | Yes |

## 📁 Project Structure

```
kite-algotrading/
├── backend/                 # Django REST API
│   ├── trading/            # Trading app with models and views
│   ├── settings.py         # Django configuration
│   └── manage.py           # Django management script
├── frontend/               # React application
│   ├── src/               # React components and logic
│   └── package.json       # Node.js dependencies
├── docs/                  # Documentation
├── scripts/               # Deployment scripts
├── test_db_connection.py  # Database connection test
└── setup_database.py     # Database setup script
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
python manage.py test
```

### Database Connection Test
```bash
python test_db_connection.py
```

## 🚀 Deployment

### Render.com
1. Create PostgreSQL service
2. Create web service
3. Set environment variables
4. Deploy from GitHub

📖 **Detailed Deployment**: See [DEPLOYMENT.md](DEPLOYMENT.md)

## 📊 Trading Features

### Order Types
- Market Orders
- Limit Orders
- Stop-Loss Orders
- GTT (Good Till Triggered)
- OCO (One Cancels Other)

### Screening Criteria
- Price-based filtering
- Volume analysis
- Technical indicators
- Custom screening logic

### Portfolio Management
- Real-time P&L tracking
- ROI calculation
- Position management
- Trade history

## 🔧 Development

### Adding New Features
1. Create feature branch
2. Implement backend API in `backend/trading/`
3. Add frontend components in `frontend/src/`
4. Update tests and documentation
5. Submit pull request

### Database Migrations
```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check the documentation in `docs/`
- Review the troubleshooting section in `docs/DATABASE_SETUP.md`

## ⚠️ Disclaimer

This software is for educational and research purposes. Trading involves financial risk. Use at your own risk and ensure compliance with local regulations.