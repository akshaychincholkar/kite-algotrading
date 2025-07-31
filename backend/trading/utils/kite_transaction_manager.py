from kiteconnect import KiteConnect
# Import Django models
from ..models.global_parameters import GlobalParameters
from ..models.user import User
from ..models.authenticator import Authenticator

def get_api_key(user_id):
    authenticator = Authenticator.objects.filter(user_id=user_id).first()
    return authenticator.api_key if authenticator else None

def get_access_token(user_id):
    authenticator = Authenticator.objects.filter(user_id=user_id).first()
    return authenticator.access_token if authenticator else None

def get_kite_client(user_id):
    api_key = get_api_key(user_id)
    access_token = get_access_token(user_id)
    if not api_key or not access_token:
        raise Exception("Missing API key or access token")
    kite = KiteConnect(api_key=api_key)
    kite.set_access_token(access_token)
    return kite

def validate_instrument(kite, stock_name):
    """
    Validate if the instrument exists and return formatted symbol and current price
    With fallback for insufficient permissions
    """
    # Clean and format the stock name
    stock_name = stock_name.strip().upper()
    
    try:
        # Try NSE first
        quote_key = f"NSE:{stock_name}"
        quote = kite.quote(quote_key)
        
        if quote_key in quote:
            current_price = quote[quote_key]["last_price"]
            return stock_name, current_price
        else:
            # If instrument not found on NSE, try BSE
            try:
                quote_key = f"BSE:{stock_name}"
                quote = kite.quote(quote_key)
                if quote_key in quote:
                    current_price = quote[quote_key]["last_price"]
                    return stock_name, current_price
            except:
                pass
            
            # If not found on either exchange, raise error
            raise ValueError(f"Instrument {stock_name} not found on NSE or BSE")
            
    except Exception as e:
        error_msg = str(e)
        
        # Handle permission issues gracefully
        if "Insufficient permission" in error_msg or "permission" in error_msg.lower():
            print(f"Warning: Insufficient permissions to fetch market data for {stock_name}")
            # Return the stock name with a fallback price (we'll calculate it later)
            return stock_name, None
        
        # For other errors, try BSE as fallback
        try:
            quote_key = f"BSE:{stock_name}"
            quote = kite.quote(quote_key)
            if quote_key in quote:
                current_price = quote[quote_key]["last_price"]
                return stock_name, current_price
        except:
            pass
        
        # If all fails and it's not a permission issue, raise the original error
        raise ValueError(f"Invalid instrument: {stock_name} not found on any exchange. Error: {error_msg}")

# Define order parameters
def place_market_order(user_id, tradingsymbol, quantity, transaction_type):
    kite = get_kite_client(user_id)
    # Accept string 'BUY' or 'SELL' and map to KiteConnect constants
    tx_type = kite.TRANSACTION_TYPE_BUY if str(transaction_type).upper() == "BUY" else kite.TRANSACTION_TYPE_SELL
    order_id = kite.place_order(
        variety=kite.VARIETY_REGULAR,
        exchange=kite.EXCHANGE_NSE,
        tradingsymbol=tradingsymbol,
        transaction_type=tx_type,
        quantity=quantity,
        order_type=kite.ORDER_TYPE_MARKET,
        product=kite.PRODUCT_CNC  # or kite.PRODUCT_MIS for intraday
    )
    print(f"Order placed successfully. Order ID: {order_id}")
    return order_id

def place_limit_order_with_gtt(user_id, tradingsymbol, quantity, buy_price, stop_loss, target):
    """
    Place a limit buy order at specified price and create GTT orders for stop loss and target
    
    Args:
        user_id: User ID for authentication
        tradingsymbol: Trading symbol (e.g., "STARCEMENT")
        quantity: Number of shares to buy
        buy_price: Price at which to buy the stock
        stop_loss: Stop loss price (should be < buy_price)
        target: Target price (should be > buy_price)
    
    Returns:
        dict: Contains order_id, stop_loss_gtt_id, target_gtt_id
    """
    kite = get_kite_client(user_id)
    
    # Validate price levels
    if stop_loss >= buy_price:
        raise ValueError("Stop loss price must be less than buy price")
    if target <= buy_price:
        raise ValueError("Target price must be greater than buy price")
    
    try:
        # Step 1: Place limit buy order
        buy_order_id = kite.place_order(
            variety=kite.VARIETY_REGULAR,
            exchange=kite.EXCHANGE_NSE,
            tradingsymbol=tradingsymbol,
            transaction_type=kite.TRANSACTION_TYPE_BUY,
            quantity=quantity,
            order_type=kite.ORDER_TYPE_LIMIT,
            price=buy_price,
            product=kite.PRODUCT_CNC,
            validity=kite.VALIDITY_DAY
        )
        print(f"Buy order placed successfully. Order ID: {buy_order_id}")
        
        # Step 2: Create combined GTT for both Stop Loss and Target (OCO - One Cancels Other)
        combined_gtt_id = kite.place_gtt(
            trigger_type=kite.GTT_TYPE_OCO,
            tradingsymbol=tradingsymbol,
            exchange=kite.EXCHANGE_NSE,
            trigger_values=[stop_loss, target],
            last_price=buy_price,
            orders=[
                {
                    # Stop Loss Order - triggered when price goes down to stop_loss
                    "transaction_type": kite.TRANSACTION_TYPE_SELL,
                    "quantity": quantity,
                    "order_type": kite.ORDER_TYPE_SLM,  # Stop Loss Market order
                    "product": kite.PRODUCT_CNC,
                    "price": 0,  # Market order, no price needed
                    "trigger_price": stop_loss
                },
                {
                    # Target Order - triggered when price goes up to target
                    "transaction_type": kite.TRANSACTION_TYPE_SELL,
                    "quantity": quantity,
                    "order_type": kite.ORDER_TYPE_LIMIT,
                    "product": kite.PRODUCT_CNC,
                    "price": target
                }
            ]
        )
        print(f"Combined Stop Loss & Target GTT created successfully. GTT ID: {combined_gtt_id}")
        
        return {
            "buy_order_id": buy_order_id,
            "combined_gtt_id": combined_gtt_id,
            "status": "success"
        }
        
    except Exception as e:
        print(f"Error in placing limit order with GTT: {str(e)}")
        raise e

def set_gtt_oco(user_id, stock_name, quantity, stop_loss, target):
    """
    Set GTT (Good Till Triggered) OCO (One Cancels Other) orders for an existing stock position
    
    Args:
        user_id: User ID for authentication
        stock_name: Trading symbol (e.g., "STARCEMENT")
        quantity: Number of shares for which to set GTT
        stop_loss: Stop loss price
        target: Target price
    
    Returns:
        dict: Contains gtt_id and status
    """
    kite = get_kite_client(user_id)
    
    # Validate that stop_loss and target are different
    if stop_loss == target:
        raise ValueError("Stop loss and target prices must be different")
    
    # Validate instrument and get current price
    try:
        validated_symbol, current_price = validate_instrument(kite, stock_name)
        stock_name = validated_symbol  # Use the validated symbol
        
        # If current_price is None (due to permission issues), use fallback
        if current_price is None:
            current_price = (stop_loss + target) / 2
            print(f"Using fallback price {current_price} for {stock_name} due to permission limitations")
        else:
            # Validate price levels based on current market price
            if stop_loss > current_price and target > current_price:
                raise ValueError("Both stop loss and target cannot be above current market price")
            if stop_loss < current_price and target < current_price:
                raise ValueError("Both stop loss and target cannot be below current market price")
            
            print(f"Validated instrument {stock_name} with current price: {current_price}")
        
    except Exception as e:
        error_msg = str(e)
        print(f"Error validating instrument {stock_name}: {error_msg}")
        
        # Handle permission issues more gracefully
        if "Insufficient permission" in error_msg or "permission" in error_msg.lower():
            print(f"Using fallback approach for {stock_name} due to insufficient permissions")
            stock_name = stock_name.strip().upper()
            current_price = (stop_loss + target) / 2
        else:
            raise ValueError(f"Invalid instrument or unable to fetch price for {stock_name}: {error_msg}")
    
    try:
        # Create OCO GTT order with both Stop Loss and Target
        gtt_id = kite.place_gtt(
            trigger_type=kite.GTT_TYPE_OCO,
            tradingsymbol=stock_name,
            exchange=kite.EXCHANGE_NSE,
            trigger_values=[stop_loss, target],
            last_price=current_price,
            orders=[
                {
                    # Stop Loss Order
                    "transaction_type": kite.TRANSACTION_TYPE_SELL,
                    "quantity": quantity,
                    "order_type": kite.ORDER_TYPE_SLM,  # Stop Loss Market order
                    "product": kite.PRODUCT_CNC,
                    "price": 0,  # Market order, no price needed
                    "trigger_price": stop_loss
                },
                {
                    # Target Order
                    "transaction_type": kite.TRANSACTION_TYPE_SELL,
                    "quantity": quantity,
                    "order_type": kite.ORDER_TYPE_LIMIT,
                    "product": kite.PRODUCT_CNC,
                    "price": target
                }
            ]
        )
        print(f"GTT OCO order set successfully for {stock_name}. GTT ID: {gtt_id}")
        
        return {
            "gtt_id": gtt_id,
            "stock_name": stock_name,
            "quantity": quantity,
            "stop_loss": stop_loss,
            "target": target,
            "current_price": current_price,
            "status": "success"
        }
        
    except Exception as e:
        error_msg = str(e)
        print(f"Error in setting GTT OCO for {stock_name}: {error_msg}")
        
        # Provide more specific error messages
        if "Insufficient permission" in error_msg:
            raise ValueError(f"Insufficient API permissions to place GTT orders. Please check your Kite Connect API permissions and ensure GTT is enabled.")
        elif "Invalid instrument" in error_msg or "tradingsymbol" in error_msg:
            raise ValueError(f"Invalid instrument: {stock_name}. Please verify the stock symbol is correct and actively traded.")
        elif "trigger_values" in error_msg:
            raise ValueError(f"Invalid trigger values. Please ensure stop loss ({stop_loss}) and target ({target}) are valid prices.")
        elif "orders" in error_msg and "product" in error_msg:
            raise ValueError(f"Invalid order configuration. Please check if your account supports CNC orders.")
        else:
            raise ValueError(f"Failed to set GTT order: {error_msg}")

# Example usage:
# place_market_order(user_id, "STARCEMENT", 1, "BUY")
# place_limit_order_with_gtt(user_id, "STARCEMENT", 1, 100.0, 95.0, 110.0)
# set_gtt_oco(user_id, "STARCEMENT", 1, 95.0, 110.0)