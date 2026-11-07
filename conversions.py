def pound_to_kg(pounds):
    """
    Convert pounds to kilograms.

    Parameters:
    pounds (float): Weight in pounds.

    Returns:
    float: Weight in kilograms.
    """
    return pounds * 0.45359237
def feet_and_inches_to_cm(feet, inches):
    """
    Convert height in feet and inches to centimeters.

    Parameters:
    feet (int): Height in feet.
    inches (int): Height in inches.

    Returns:
    float: Height in centimeters.
    """
    total_inches = (feet * 12) + inches
    return total_inches * 2.54