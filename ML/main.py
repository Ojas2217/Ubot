from model import prepare,get_params
from score_calculator import calculate_score
if __name__ == "__main__":   

    X_train, X_test, y_train, y_test,hex_train,hex_test = prepare()
    theta1, theta2, bias = get_params(X_train, y_train)
    hex_scores = calculate_score(X_test,y_test,theta1,theta2,bias,hex_test)

    print(hex_scores)

    